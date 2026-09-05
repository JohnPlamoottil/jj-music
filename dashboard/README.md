# JJ Music

A private music library you host yourself. Upload the music you own, keep it in
your own object storage, and stream it to your iPhone, iPad, Mac or any browser
you sign in from.

Nothing about the app is a catalogue or a store. There is no discovery, no
recommendations and no third-party audio: it plays your files, and only yours.

**Status: Phase 1 of 10 complete.** The client is built and runs against an
in-memory mock of the REST API so every screen can be reviewed before the server
exists. Phases 2–10 replace that mock with the real Express + MongoDB backend.
See [Build phases](#build-phases).

---

## Contents

1. [What JJ Music does](#what-jj-music-does)
2. [Architecture](#architecture)
3. [Requirements](#requirements)
4. [Installation](#installation)
5. [Environment variables](#environment-variables)
6. [MongoDB setup](#mongodb-setup)
7. [Storage configuration](#storage-configuration)
8. [Running locally](#running-locally)
9. [Adding a test file you own](#adding-a-test-file-you-own)
10. [Building for production](#building-for-production)
11. [Deployment](#deployment)
12. [Installing JJ Music on an iPhone](#installing-jj-music-on-an-iphone)
13. [Security](#security)
14. [Backups](#backups)
15. [Build phases](#build-phases)

---

## What JJ Music does

- **Upload** MP3, M4A, AAC and WAV files, with progress per file, editable
  metadata and optional artwork.
- **Organise** your library into songs, albums, artists, playlists and
  favourites, all derived from the tags on your own files.
- **Stream** over HTTP range requests, so playback starts immediately and
  seeking works without downloading the whole track.
- **Play** through a persistent player that keeps going as you move around the
  app, with a queue, shuffle, repeat and a full-screen Now Playing view.
- **Control** playback from the iPhone Lock Screen and Control Center wherever
  the browser supports the Media Session API.

## Architecture

```
jj-music/
├── client/                 React + Vite + TypeScript + Tailwind
│   ├── public/             manifest, icons
│   └── src/
│       ├── components/     layout, player, ui
│       ├── context/        player, auth, toasts
│       ├── hooks/          data loading, media session, keyboard
│       ├── pages/          one file per screen
│       ├── services/       the only place that talks to the API
│       ├── types/          shared API types
│       └── utils/          formatting, artwork, event bus
└── server/                 Node + Express + TypeScript (Phase 2 onward)
    └── src/
        ├── config/  controllers/  middleware/
        ├── models/  routes/  services/  utils/
        └── uploads/        development audio, never committed
```

Three rules shape the whole design:

1. **MongoDB stores metadata; object storage stores audio.** A song document
   holds a `storageKey`, never the file, and that key is never sent to the
   browser.
2. **The browser talks to `/api` and nothing else.** Storage credentials stay on
   the server. Audio is served by an authenticated streaming route on your own
   origin, so a private song is never reachable through a permanent public URL.
3. **The audio element outlives the router.** It is created once in
   `PlayerContext` and never rendered as JSX, so navigating between pages cannot
   interrupt playback.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- MongoDB 6 or newer (local, or MongoDB Atlas) — needed from Phase 2
- An S3-compatible bucket for production audio (AWS S3, Cloudflare R2, or
  similar) — optional in development

## Installation

```bash
git clone <your-repository-url> jj-music
cd jj-music
npm run install:all
```

Or install each side separately:

```bash
npm --prefix client install
npm --prefix server install
```

## Environment variables

The server reads `server/.env`; the client reads `client/.env`. Copy the
examples and fill them in — neither example contains a real credential.

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**`server/.env`**

| Variable | What it does |
| --- | --- |
| `PORT` | Port the API listens on. Default 4000. |
| `NODE_ENV` | `development` or `production`. Controls cookie flags. |
| `CLIENT_URL` | Origin allowed by CORS, e.g. `http://localhost:5173`. |
| `MONGODB_URI` | Connection string. Metadata only. |
| `SESSION_SECRET` | Signs the session cookie. Long and random. |
| `SESSION_TTL_DAYS` | How long a session lasts. |
| `ALLOW_REGISTRATION` | Set `false` once your own account exists. |
| `STORAGE_PROVIDER` | `local` or `s3`. |
| `LOCAL_UPLOAD_DIR` | Where development uploads are written. |
| `S3_ENDPOINT` | Provider endpoint. Blank for AWS S3. |
| `S3_REGION`, `S3_BUCKET` | Bucket location and name. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Storage credentials. |
| `S3_FORCE_PATH_STYLE` | `true` for most non-AWS providers. |
| `S3_SIGNED_URL_TTL` | Lifetime of signed URLs, in seconds. |
| `MAX_UPLOAD_MB` | Rejects anything larger. |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**`client/.env`**

| Variable | What it does |
| --- | --- |
| `VITE_USE_MOCK_API` | `true` runs the UI against sample metadata in your browser. Set `false` from Phase 3. |
| `VITE_DEV_API_TARGET` | Where Vite proxies `/api` in development. |

## MongoDB setup

Local, with Docker:

```bash
docker run -d --name jj-mongo -p 27017:27017 -v jj-mongo-data:/data/db mongo:7
```

Local, with Homebrew on macOS:

```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

Either way:

```
MONGODB_URI=mongodb://127.0.0.1:27017/jj-music
```

MongoDB Atlas works too — create a free cluster, add your IP to the access list,
and paste the connection string in.

## Storage configuration

**Development (`STORAGE_PROVIDER=local`)** writes uploads to
`server/uploads/`. That directory is not served statically; audio only leaves
the server through the authenticated streaming route, and it is excluded from
git.

**Production (`STORAGE_PROVIDER=s3`)** works with any S3-compatible provider.
For Cloudflare R2:

```
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=jj-music
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
```

Keep the bucket private. Block all public access, and do not attach a public
custom domain to it.

## Running locally

Two terminals:

```bash
# terminal 1 — API
npm --prefix server run dev

# terminal 2 — client
npm --prefix client run dev
```

Open <http://localhost:5173>.

To try it on your iPhone over the same wifi, Vite already listens on your local
network — use the Network address it prints, for example
`http://192.168.1.20:5173`.

While `VITE_USE_MOCK_API=true` the client never calls the API at all, so you can
run the client on its own.

## Adding a test file you own

No music ships with JJ Music, and none should: the repository must stay free of
commercial audio, and `.gitignore` blocks audio files from being committed.

The sample library is metadata only — invented artists and albums with no audio
behind them. So the transport controls have something to drive, mock mode
synthesises a quiet tone of the right length in your browser. It is not music
and it is not in the repository.

To hear a real file:

1. Start the client with `VITE_USE_MOCK_API=true`.
2. Open **Upload music** and drop in an MP3 or M4A that you own.
3. It plays for that browser session.

From Phase 4 onward, uploads go to the server and are stored properly:

```bash
mkdir -p server/uploads
# then upload through the app — do not copy files in by hand,
# the database needs a matching song document
```

## Building for production

```bash
npm --prefix client run build     # static files in client/dist
npm --prefix server run build     # compiled API in server/dist
npm --prefix server start
```

## Deployment

The API and the built client should be served from **the same origin**. The
session cookie is `SameSite=Lax` and HTTP-only, which is simplest and safest
when there is one origin; splitting them across domains means loosening that.

A typical single-host setup:

1. Put a reverse proxy (Caddy, nginx) in front, terminating TLS.
2. Serve `client/dist` as static files.
3. Proxy `/api` to the Node process.
4. Run the Node process under a supervisor (systemd, pm2, Docker).

HTTPS is not optional: iOS will not install a PWA, and browsers will not expose
Media Session controls, over plain HTTP on anything but localhost.

## Installing JJ Music on an iPhone

1. Open your JJ Music URL in **Safari** (not Chrome — only Safari can install to
   the Home Screen on iOS).
2. Tap the **Share** button.
3. Choose **Add to Home Screen**, then **Add**.
4. Launch it from the Home Screen. It opens without Safari's chrome, in
   standalone mode.

What works, honestly:

- Audio keeps playing when you lock the screen or switch apps, for as long as
  iOS allows a backgrounded web app to hold the audio session. This is not the
  same as a native app's background execution, and iOS can stop it.
- Lock Screen and Control Center controls appear when the browser supports the
  Media Session API. iOS supports the metadata and the main transport actions;
  support for seeking and position reporting varies by iOS version. Anything
  the browser does not support is left out rather than shown as a dead button.
- Offline playback is **not** enabled. See Settings for why.

## Security

- Passwords are hashed with bcrypt or Argon2. Plaintext is never stored.
- Sessions live in an HTTP-only, `SameSite=Lax`, `Secure` cookie. No token is
  readable by JavaScript, so a script injection cannot walk off with your login.
- Every route except register and login requires a session, and every query is
  scoped to the signed-in user's id.
- Uploads are checked on **content**, not just the filename: extension, declared
  MIME type and sniffed file signature must agree, and the size limit is
  enforced by the server as well as the browser.
- Stored object names are generated server-side. A file called
  `../../etc/passwd.mp3` cannot escape anywhere.
- Storage credentials exist only in the server's environment. The client is
  given a stream URL on your own origin, never a bucket URL.
- `helmet`, CORS restricted to `CLIENT_URL`, and rate limits on authentication
  and upload routes.
- Set `ALLOW_REGISTRATION=false` after creating your account. It is your
  library; nobody else needs to sign up.

## Backups

Two things need backing up, and they are only useful together:

1. **Your audio.** For S3 or R2, turn on bucket versioning and, if the provider
   offers it, replication to a second bucket. For local storage, back up
   `server/uploads/`.
2. **Your database.** Metadata, playlists, favourites and history live here.

```bash
# dump
mongodump --uri="$MONGODB_URI" --out=backup-$(date +%F)

# restore
mongorestore --uri="$MONGODB_URI" --drop backup-2026-01-31
```

Keep the original files somewhere outside the app as well. JJ Music is a
convenient way to listen to your collection; it should not be the only copy of
it.

## Build phases

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Repository structure and full frontend UI | Done |
| 2 | MongoDB models and Express API | Next |
| 3 | Connect the frontend to the real API | |
| 4 | Real uploads, server-side tag reading | |
| 5 | Streaming with HTTP range requests | |
| 6 | Playlists, favourites, albums, artists, search, queue, history end to end | |
| 7 | Authentication and hardening | |
| 8 | PWA service worker and Media Session polish | |
| 9 | iPhone testing pass | |
| 10 | Deployment configuration and documentation | |

Phase 1 was built against the finished API contract — the same routes, query
parameters and response shapes the server will implement — so Phase 3 is a
configuration change rather than a rewrite.
