import { Pool } from 'pg';
import { createClient } from 'redis';
import { S3Client } from '@aws-sdk/client-s3';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const redis = createClient({ url: process.env.REDIS_URL });
redis.on('error', (err) => console.error('Redis error:', err));

export const s3 = new S3Client({
  region: process.env.MINIO_REGION || 'us-east-1',
  endpoint: process.env.MINIO_ENDPOINT
    ? `http://${process.env.MINIO_ENDPOINT}`
    : undefined,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || '',
    secretAccessKey: process.env.MINIO_SECRET_KEY || '',
  },
  forcePathStyle: true,
});

export const MINIO_BUCKET = process.env.MINIO_BUCKET || 'game-servers';
export const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
