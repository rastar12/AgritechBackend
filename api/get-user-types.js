import db from './db.js';

const getUserTypes = async () => {
  try {
    const [rows] = await db.query('SELECT * FROM USER_TYPES');
    
    console.log('--- USER TYPES ---');
    console.table(rows);
    
    process.exit(0);
  } catch (error) {
    console.error('Error retrieving user types:', error.message);
    process.exit(1);
  }
};

getUserTypes();
