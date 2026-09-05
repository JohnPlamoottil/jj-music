# Phase 2: Express + MongoDB Backend — Complete

## Summary

Phase 2 builds the real Express.js backend that the frontend will connect to in Phase 3. Every API route returns the exact same shape the mock API returns, so Phase 3 is just flipping an environment variable.

## What was built

### Models (Mongoose)
- **User** — email, password hash (bcrypt), displayName; methods: comparePassword, toJSON (excludes hash)
- **Song** — userId, title, artist, album, genre, year, trackNumber, duration, fileSize, mimeType, favorite, playCount, uploadedAt, lastPlayedAt, storageKey; indexed by userId + album/artist/favorite
- **Playlist** — userId, name, description, artworkUrl, songIds array
- **PlaybackHistory** — userId, songId, playedAt; indexed by userId + playedAt

### Authentication middleware
- `authMiddleware` — checks session.userId, loads user, throws 401 if not found
- `optionalAuth` — attaches userId to request if session exists (for future use)
- Password hashing via bcryptjs with salt 10

### Routes (all authenticated)

#### `/api/auth`
- `POST /login` — email + password → sets session, returns user
- `POST /register` — email + password → creates user (if ALLOW_REGISTRATION=true), sets session
- `GET /me` — returns current user
- `POST /logout` — clears session

#### `/api/songs`
- `GET /` — list with search (q), sort (title|artist|album|recent|played|favorite), pagination (page, limit)
- `GET /:id` — get single song
- `PUT /:id` — update title, artist, album, genre, year, trackNumber, artworkUrl
- `DELETE /:id` — delete song
- `POST /:id/favorite` — toggle favorite flag

#### `/api/albums`
- `GET /` — list albums grouped by unique album names, pagination
- `GET /:id` — get album detail with ordered songs (album name is URL-encoded)

#### `/api/artists`
- `GET /` — list artists with album count, pagination
- `GET /:id` — get artist detail with albums array + songs list (artist name is URL-encoded)

#### `/api/playlists`
- `GET /` — list playlists
- `GET /:id` — get playlist detail with ordered songs
- `POST /` — create new playlist
- `PUT /:id` — update name, description, or reorder songs (via songIds)
- `DELETE /:id` — delete playlist
- `POST /:id/songs` — add songs to playlist
- `DELETE /:id/songs/:songId` — remove song from playlist

#### `/api/history`
- `GET /` — list playback history (paginated, sorted by playedAt desc)
- `POST /` — record a play (updates song.lastPlayedAt and playCount)

#### `/api/stats`
- `GET /stats` — returns songCount, favoriteCount, playlistCount, totalPlayTime (seconds), listeningTime (count of history entries)

#### `/api/health`
- `GET /health` — returns `{ status: "ok" }` (unauthenticated)

### Middleware & configuration
- **Helmet** — security headers
- **CORS** — whitelists CLIENT_URL (http://localhost:5173 in dev)
- **Rate limiting** — 100 requests per 15 minutes on /api/*
- **Session** — express-session with HTTP-only cookies, 30 day TTL by default
- **Error handler** — catches AppError, validation errors, duplicate key (409), returns JSON
- **Config** — reads .env, all values have sensible defaults for development

## File structure created

```
server/
├── .env                      development config (git-ignored in real use)
├── .env.example              template
├── package.json              dependencies + npm scripts
├── tsconfig.json             TypeScript config
├── src/
│   ├── config/index.ts       environment + config object
│   ├── types/index.ts        TypeScript interfaces (IUser, ISong, etc.)
│   ├── models/
│   │   ├── User.ts
│   │   ├── Song.ts
│   │   ├── Playlist.ts
│   │   ├── PlaybackHistory.ts
│   │   └── index.ts          exports all models
│   ├── middleware/
│   │   ├── auth.ts           authMiddleware, optionalAuth
│   │   └── errorHandler.ts   AppError class + error handler
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── songs.ts
│   │   ├── albums.ts
│   │   ├── artists.ts
│   │   ├── playlists.ts
│   │   ├── history.ts
│   │   └── stats.ts
│   └── index.ts              Express app + MongoDB connection
└── uploads/                  .gitkeep (local storage for audio)
```

## Next steps (Phase 3)

1. **Ensure MongoDB is running locally:**
   ```bash
   mongod --dbpath /path/to/db
   ```

2. **Install server dependencies:**
   ```bash
   npm --prefix server install
   ```

3. **Run both client and server:**
   ```bash
   npm --prefix client run dev     # terminal 1, port 5173
   npm --prefix server run dev     # terminal 2, port 4000
   ```

4. **Test the API:**
   ```bash
   curl http://localhost:4000/api/health
   ```

5. **In Phase 3, flip the mock flag:**
   - Change `client/.env`: `VITE_USE_MOCK_API=false`
   - The same client code now talks to `http://localhost:4000/api` (via Vite proxy)
   - All routes return identical shapes, so zero UI changes

## Key decisions

**Session storage:** HTTP-only cookies with express-session. In production (Phase 9), this can be swapped for Redis via `connect-redis` without changing the auth routes.

**Password hashing:** bcryptjs (sync wrapper around bcrypt) runs at save time, not on login. comparePassword is an instance method.

**MongoDB indexes:** Compound indexes on (userId, album), (userId, artist), (userId, favorite), and (userId, playedAt) for common queries.

**Error responses:** All errors return `{ error: "message" }` in JSON, matching the mock. No stacktraces in production.

**CORS:** Strict allow-list on CLIENT_URL. In production, this is your domain (kannasiTunesmusic.com).

## What's NOT in Phase 2

- Upload endpoint (Phase 4) — file handling, storage abstraction, metadata extraction
- Audio streaming (Phase 5) — HTTP range requests, storage key resolution
- Service worker (Phase 8) — offline support, cache management
- Deployment (Phase 9) — Docker, reverse proxy, TLS, environment setup
- Full test suite (Phase 10)

## Testing the backend

After running both servers:

```bash
# Sign up
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt

# Check current user
curl http://localhost:4000/api/auth/me -b cookies.txt

# List songs (empty)
curl http://localhost:4000/api/songs -b cookies.txt

# Get stats
curl http://localhost:4000/api/stats -b cookies.txt
```

The frontend admin dashboard will also work against the real backend once Phase 3 is live.
