import dotenv from 'dotenv';

dotenv.config();

const clientOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173,https://kannasmusic.online')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

export const config = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jj-music',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  SESSION_TTL_DAYS: parseInt(process.env.SESSION_TTL_DAYS || '30', 10),
  CLIENT_URL: clientOrigins[0] || 'http://localhost:5173',
  CLIENT_URLS: clientOrigins,
  ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION !== 'false',
  STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 's3',
  LOCAL_UPLOAD_DIR: process.env.LOCAL_UPLOAD_DIR || './uploads',
  MAX_UPLOAD_MB: parseInt(process.env.MAX_UPLOAD_MB || '100', 10),
  S3: {
    ENDPOINT: process.env.S3_ENDPOINT,
    REGION: process.env.S3_REGION,
    BUCKET: process.env.S3_BUCKET,
    ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE === 'true',
    SIGNED_URL_TTL: parseInt(process.env.S3_SIGNED_URL_TTL || '300', 10),
  },
};
