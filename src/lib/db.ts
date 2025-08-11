import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://tg_db_owner:nVaf7lWv9HrB@ep-frosty-voice-a2s9itd4-pooler.eu-central-1.aws.neon.tech/tg_db?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export { pool };