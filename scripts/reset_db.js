import db from '../api/db.js';

const resetDb = async () => {
  try {
    console.log('🗑️  Starting Database Reset...');

    await db.query('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      'system_logs',
      'orders',
      'marketplace_items',
      'planting_requests',
      'growth_stages',
      'users',
      'crops'
    ];

    for (const table of tables) {
      console.log(`  Cleaning ${table}...`);
      await db.query(`TRUNCATE TABLE ${table}`);
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('✨ Database reset successfully! (user_types preserved)');
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
};

resetDb();
