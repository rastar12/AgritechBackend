import db from './api/db.js';

async function fixDb() {
  try {
    console.log('Adding last_login column to users table...');
    await db.query('ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL');
    console.log('Successfully added last_login column.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.error('Error:', error);
    }
  } finally {
    process.exit(0);
  }
}

fixDb();
