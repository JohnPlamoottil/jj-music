# JJ Music API

Empty until Phase 2. The folders are the plan:

- `config/` — environment loading, database connection, storage provider choice
- `models/` — Mongoose schemas: User, Song, Playlist, PlaybackHistory
- `routes/` — Express routers, one per resource
- `controllers/` — request handling, one function per endpoint
- `services/` — storage abstraction (local and S3-compatible), metadata reading
- `middleware/` — authentication, validation, rate limits, upload limits, errors
- `utils/` — shared helpers

`uploads/` holds development audio. It is served only through the authenticated
streaming route and is excluded from git.
