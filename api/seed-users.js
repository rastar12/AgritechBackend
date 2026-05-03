import db from '../db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const users = [
  {
    full_name: 'System Admin',
    email: 'admin@agritech.com',
    phone_number: '254700000000',
    password: 'admin123',
    role: 'Admin'
  },
  {
    full_name: 'John Farmer',
    email: 'farmer@agritrace.com',
    phone_number: '254711111111',
    password: 'farmer123',
    role: 'Farmer'
  },
  {
    full_name: 'Jane Buyer',
    email: 'buyer@agritrace.com',
    phone_number: '254722222222',
    password: 'buyer123',
    role: 'Buyer'
  }
];

async function seedUsers() {
  console.log('🌱 Starting User Seeding...');
  
  try {
    for (const userData of users) {
      // 1. Check if user already exists
      const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [userData.email]);
      
      if (existing.length > 0) {
        console.log(`⚠️ User ${userData.email} already exists. Skipping...`);
        continue;
      }

      // 2. Get Role ID
      const [roles] = await db.query('SELECT id FROM user_types WHERE role_name = ?', [userData.role]);
      if (roles.length === 0) {
        console.log(`❌ Role ${userData.role} not found in user_types table!`);
        continue;
      }
      const type_id = roles[0].id;

      // 3. Hash Password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(userData.password, salt);

      // 4. Insert User
      await db.query(
        'INSERT INTO users (type_id, full_name, email, phone_number, password_hash) VALUES (?, ?, ?, ?, ?)',
        [type_id, userData.full_name, userData.email, userData.phone_number, password_hash]
      );

      console.log(`✅ Created ${userData.role}: ${userData.email} (Password: ${userData.password})`);
    }

    console.log('🚀 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    process.exit();
  }
}

seedUsers();
