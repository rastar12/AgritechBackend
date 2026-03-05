import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const caPath = process.env.DB_CA_PATH || path.resolve(__dirname, '../ca.pem');

let sslConfig = null;

try {
  if (fs.existsSync(caPath)) {
    sslConfig = {
      ca: fs.readFileSync(caPath),
    };
    console.log('✅ SSL CA certificate loaded successfully.');
  } else {
    console.warn('⚠️  Warning: ca.pem not found. Database connection might fail if SSL is required.');
  }
} catch (error) {
  console.error('❌ Error reading CA certificate:', error.message);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
