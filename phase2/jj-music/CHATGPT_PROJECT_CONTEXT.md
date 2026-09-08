# JJ Music — Project Handoff Context

## Project Goal

JJ Music / Kanna's Music is a private self-hosted music application.

Production:
- Domain: kannasmusic.online
- GitHub repository: JohnPlamoottil/jj-music
- Branch: main
- Hosting: Render
- Database: MongoDB
- Object storage: AWS S3
- S3 bucket: jj-music-app
- AWS region: us-east-2

IMPORTANT:
Work with me ONE STEP AT A TIME.
Do not give me a long sequence of Terminal commands at once.
Clearly tell me whether something belongs in:
1. VS Code
2. Terminal
3. Render
4. AWS

Do not expose or ask me to paste passwords, AWS secret keys, MongoDB credentials, or other secrets.

---

# IMPORTANT PROJECT PATHS

The Git repository root on my Mac is:

/Users/johnplamoottil/projects/GitHub Projects and Lessons/17 - music_app

The ACTUAL production JJ Music application we are working on is:

/Users/johnplamoottil/projects/GitHub Projects and Lessons/17 - music_app/phase2/jj-music

Be careful because the repository contains OTHER client directories.

The production frontend is:

phase2/jj-music/client

The production backend is:

phase2/jj-music/server

The local importer is:

phase2/jj-music/scripts/import-itunes.mjs

Do NOT accidentally edit the root-level client instead of phase2/jj-music/client.

---

# Application Stack

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS

Backend:
- Node.js
- Express
- TypeScript

Database:
- MongoDB

Storage:
- AWS S3

Deployment:
- Render

---

# Render Configuration

Render Root Directory is currently BLANK.

This is intentional because the Git repository contains multiple project directories.

The corrected Render Build Command is:

npm --prefix phase2/jj-music/client install && npm --prefix phase2/jj-music/client run build && rm -rf phase2/jj-music/server/public && cp -r phase2/jj-music/client/dist phase2/jj-music/server/public && npm --prefix phase2/jj-music/server install && npm --prefix phase2/jj-music/server run build

This is important.

Previously Render incorrectly built the root-level:

client

instead of:

phase2/jj-music/client

That caused frontend changes to appear missing from production.

Do not change the Render Root Directory or Build Command without understanding this setup.

---

# Current Working Production Pipeline

The following pipeline is CONFIRMED WORKING:

Mac/local MP3
    ↓
JJ Music upload API
    ↓
AWS S3
    ↓
MongoDB song metadata
    ↓
authenticated stream endpoint
    ↓
browser playback

A newly uploaded MP3 has been tested successfully in production.

---

# S3 Structure

Desired structure:

songs/
artwork/
videos/

Examples:

songs/con_calma.mp3
songs/better_came_along_instrumental.mp3

artwork/con_calma.png

Future:

videos/example_music_video.mp4

Song filenames are normalized to readable S3 keys instead of random generated names.

Relevant server storage code is in:

server/src/storage.ts

A helper cleans song filenames approximately like:

song name.mp3
→
song_name.mp3

Do NOT manually rename S3 objects after MongoDB records have been created because MongoDB storageKey must continue pointing to the correct S3 object.

---

# Artwork

Artwork upload to S3 is working.

Artwork objects use:

artwork/<filename>

The backend has an authenticated artwork endpoint:

GET /api/songs/artwork/:id

The frontend receives an application artwork URL rather than direct permanent S3 access.

Helmet CSP was updated to permit S3/HTTPS artwork images.

Production artwork display was successfully tested.

---

# Audio Streaming

Production audio streaming is working.

Song streaming uses an authenticated backend endpoint and signed S3 access.

Relevant route:

GET /api/songs/:id/stream

Do not replace this with public S3 objects.

---

# Delete All Feature

A Delete All button was added to the production Songs page.

Frontend:

client/src/pages/Songs.tsx
client/src/services/api.ts

Backend:

DELETE /api/songs

The backend performs:

Song.deleteMany({ userId: req.userId })

Delete All removes MongoDB song records for the logged-in user.

It intentionally DOES NOT delete S3 objects.

The feature was successfully tested and deleted 164 old song records.

---

# Playback History Fix

Deleting all songs exposed stale PlaybackHistory records.

The history endpoint previously populated deleted song references and then attempted to access:

song._id

when song was null.

This caused:

GET /api/history?page=1&limit=12

to return HTTP 500 and caused the Home page to display:

Request failed.

The fix in:

server/src/routes/history.ts

changed mapping to ignore history entries whose populated songId no longer exists:

entries.filter(entry => entry.songId).map(...)

This was committed and deployed.

Commit:

1437daf
Handle deleted songs in playback history

The Home page now works correctly with an empty song library.

---

# Recent Important Commits

b164d20
Add S3 artwork support for music imports

298100d
Allow S3 artwork images in CSP

2cc6a96
Use readable song filenames for S3 uploads

7da457b
Add delete all songs button to JJ Music frontend

1437daf
Handle deleted songs in playback history

---

# iTunes Migration — NEXT MAJOR TASK

THIS IS THE NEXT TASK TO WORK ON.

My iTunes music folder is:

/Users/johnplamoottil/Music/iTunes/iTunes Media/Music

There is already an importer:

scripts/import-itunes.mjs

The importer is LOCAL tooling and currently has uncommitted changes.

Do NOT overwrite it without inspecting the existing file first.

music-metadata is installed.

Node version previously used:

v20.19.2

The importer has already successfully:

1. scanned local MP3 files
2. read embedded metadata
3. authenticated against JJ Music
4. uploaded an MP3
5. extracted embedded artwork
6. uploaded artwork
7. created the MongoDB song record
8. successfully played the resulting song in production

---

# Known iTunes MP3 Files

The previous scan found 9 MP3 files.

Examples include:

Daddy Yankee & Snow / Con Calma.mp3

Sline / Better Came Along (Instrumental).mp3

Unknown Artist / Aladdin 2019 (Full Original Soundtrack).mp3

Unknown Artist / BOLLYWOOOD BEST SONGS 2019....mp3

Unknown Artist / Bhangra Empire - Tanjeev and Navi's Wedding Reception.mp3

Unknown Artist / Denise Rosenthal - Lucha En Equilibrio.mp3

Unknown Artist / Patho Lesson3 Jan22.mp3

Unknown Artist / Top 10 Indian #WeddingDanceSongs 2018....mp3

Unknown Artist / Top 10 Indian #WeddingDanceSongs 2020....mp3

Do not assume there are still exactly 9 files. Rescan before importing.

---

# Known Embedded Metadata Results

Previously:

Con Calma:
- title available
- artist available
- embedded artwork YES

Better Came Along:
- title available
- artist available
- embedded artwork YES

Aladdin soundtrack:
- incomplete tags
- embedded artwork YES

Bollywood Best Songs:
- incomplete tags
- embedded artwork YES

Bhangra Empire:
- incomplete tags
- embedded artwork NO

Denise Rosenthal:
- incomplete tags
- embedded artwork NO

Patho Lesson3:
- incomplete tags
- embedded artwork NO

Wedding Songs 2018:
- incomplete tags
- embedded artwork YES

Wedding Songs 2020:
- incomplete tags
- embedded artwork YES

Previous scan found embedded artwork in approximately 6 of 9 files.

Use actual current metadata instead of assuming these results remain unchanged.

---

# Metadata Migration Requirements

For every imported iTunes track, preserve as much REAL metadata as available.

Desired fields:

- title
- artist
- album
- album artist if supported
- year
- genre
- track number
- disc number if supported
- duration
- MIME type
- file size
- artwork
- lyrics if embedded
- original filename
- storage key

Do NOT invent artist/album/year/lyrics.

If metadata is unavailable, use reasonable fallback values such as:

title → filename without extension
artist → Unknown Artist
album → Uploaded Library

Artwork should use embedded artwork when available.

Lyrics should be imported only when actually present in the source metadata.

---

# iTunes Playlists

I want to migrate my ACTUAL iTunes playlists too.

Do not infer playlists from directory names.

iTunes playlist membership normally comes from the iTunes library database/XML.

Before implementing playlist migration, locate the iTunes library metadata using something similar to:

find "$HOME/Music/iTunes" -maxdepth 2 \( -iname "*.xml" -o -iname "*.itl" -o -iname "*.musiclibrary" \) -print

Inspect what actually exists before writing playlist migration code.

Goal:

iTunes playlist
    ↓
match its tracks
    ↓
upload/match JJ Music songs
    ↓
create JJ Music playlist
    ↓
preserve playlist track order

Avoid uploading duplicate audio objects just because a song belongs to multiple playlists.

One S3 song object can belong to multiple MongoDB playlists.

---

# Future Account Architecture

My account should become the MAIN OWNER / ADMIN account.

Desired permissions:

OWNER ACCOUNT:
- upload MP3s
- import iTunes
- upload artwork
- future MP4 upload
- manage master library
- delete owned songs
- share songs
- share playlists

OTHER USER ACCOUNTS:
- cannot upload to my master S3 library by default
- cannot delete my S3 objects
- can receive songs shared by the owner
- can receive shared playlists
- can stream authorized shared songs
- can potentially add shared songs to their own playlists

Do not duplicate an S3 MP3 merely because it is shared.

Desired conceptual model:

Song:
- ownerId
- sharedWith[]

Playlist:
- ownerId
- sharedWith[]

The backend must enforce authorization.

Do not rely only on frontend hiding of buttons.

This sharing system is a FUTURE task.

Finish iTunes migration first.

---

# Future MP4 Video Support

After iTunes migration, I want MP4 support.

Desired S3 structure:

videos/<readable_filename>.mp4

The application should distinguish:

audio
video

MP4 playback should eventually support:

- play/pause
- seeking
- volume
- fullscreen
- metadata
- artwork/thumbnail
- authenticated access

Do not implement MP4 support until the iTunes migration is stable.

---

# IMPORTANT DEVELOPMENT RULES

1. Preserve the working production upload/playback pipeline.

2. Do not make broad rewrites when a small change solves the problem.

3. Inspect existing files before replacing them.

4. Run:

npm run build

before committing production changes.

5. Do not commit scripts/import-itunes.mjs accidentally with unrelated changes.

6. Stage only the intended files.

7. Never expose AWS/MongoDB/session secrets.

8. Do not make S3 objects public just to make playback easier.

9. Keep authentication/authorization on streaming and artwork endpoints.

10. Work with me ONE STEP AT A TIME.

---

# CURRENT STATUS

Production website is working.

Home page works.

Songs page works.

Delete All works.

S3 MP3 upload works.

S3 playback works.

S3 artwork works.

A newly uploaded MP3 works.

Old 164 MongoDB song records were deleted.

Some incorrectly named test S3 objects were manually deleted.

The library is now ready for the proper iTunes migration.

---

# NEXT ACTION

Do NOT immediately modify code.

First inspect:

scripts/import-itunes.mjs

Then locate the iTunes library metadata file/database.

Then determine how playlists map to local track files.

Then design the import process before running the bulk migration.

The immediate objective is:

Migrate my iTunes songs into JJ Music with:
- readable S3 filenames
- embedded artwork
- title
- artist
- album
- year
- genre
- track information
- lyrics when actually available
- iTunes playlists
- correct playlist order

without duplicating S3 audio files.

Work with me one step at a time.