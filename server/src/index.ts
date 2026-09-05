/**
 * JJ Music API — entry point.
 *
 * Phase 1 ships the process, the configuration loader and a health check so the
 * shape of the server is settled. Phase 2 adds the Mongoose models and the
 * routes under src/routes, wired in below.
 */
import 'dotenv/config';
import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      storage: process.env.STORAGE_PROVIDER ?? 'local',
      time: new Date().toISOString(),
    },
  });
});

// Phase 2 mounts the real routers here:
//   app.use('/api/auth', authRouter);
//   app.use('/api/songs', songsRouter);
//   ...and helmet, cors, rate limiting and the error handler in Phase 7.

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`JJ Music API listening on http://localhost:${port}`);
});
