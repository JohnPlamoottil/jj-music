import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { config } from './config';

const isS3Enabled = config.STORAGE_PROVIDER === 's3';

const s3Client = isS3Enabled
  ? new S3Client({
      region: process.env.AWS_REGION || 'us-east-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    })
  : null;

export async function uploadFile(filePath: string, fileName: string, mimeType: string): Promise<string> {
  if (!isS3Enabled || !s3Client) {
    const uploadDir = config.LOCAL_UPLOAD_DIR;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const destPath = path.join(uploadDir, fileName);
    fs.copyFileSync(filePath, destPath);
    return fileName;
  }

  const fileContent = fs.readFileSync(filePath);
  const s3Key = `songs/${fileName}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || '',
      Key: s3Key,
      Body: fileContent,
      ContentType: mimeType,
    })
  );

  return s3Key;
}

export async function getStreamUrl(storageKey: string): Promise<string> {
  if (!isS3Enabled || !s3Client) {
    return storageKey;
  }

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET || '',
    Key: storageKey,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
}

export function getLocalFilePath(storageKey: string): string {
  return path.join(config.LOCAL_UPLOAD_DIR, storageKey);
}
