import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      ca: fs.readFileSync(process.env.DB_CA_PATH),
    },
  });

  try {
    console.log('Adding actual_yield_kg column...');
    await connection.query("ALTER TABLE planting_requests ADD COLUMN actual_yield_kg DECIMAL(10,2) NULL AFTER expected_yield_kg;");
    console.log('Column added successfully.');
  } catch (error) {
    if (error.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Column already exists.');
    } else {
      console.error('Error adding column:', error);
    }
  } finally {
    await connection.end();
  }
};

run();
