import db from './db.js';

const initSchema = async () => {
  try {
    console.log('🚀 Starting database initialization (Resetting tables)...');

    // Drop tables in reverse order of dependencies
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('DROP TABLE IF EXISTS ORDERS');
    await db.query('DROP TABLE IF EXISTS MARKETPLACE_ITEMS');
    await db.query('DROP TABLE IF EXISTS PLANTING_REQUESTS');
    await db.query('DROP TABLE IF EXISTS GROWTH_STAGES');
    await db.query('DROP TABLE IF EXISTS USERS');
    await db.query('DROP TABLE IF EXISTS CROPS');
    await db.query('DROP TABLE IF EXISTS USER_TYPES');
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('🗑️  Old tables dropped.');

    // 1. USER_TYPES (String IDs)
    await db.query(`
      CREATE TABLE USER_TYPES (
        id VARCHAR(10) PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL UNIQUE
      ) ENGINE=InnoDB;
    `);

    // 2. CROPS
    await db.query(`
      CREATE TABLE CROPS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        crop_name VARCHAR(100) NOT NULL,
        baseline_yield_per_acre FLOAT,
        total_maturity_days INT,
        price_per_kg FLOAT,
        image_url VARCHAR(255)
      ) ENGINE=InnoDB;
    `);

    // 3. USERS (type_id is now VARCHAR)
    await db.query(`
      CREATE TABLE USERS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type_id VARCHAR(10),
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone_number VARCHAR(20),
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (type_id) REFERENCES USER_TYPES(id)
      ) ENGINE=InnoDB;
    `);

    // 4. GROWTH_STAGES
    await db.query(`
      CREATE TABLE GROWTH_STAGES (
        id INT AUTO_INCREMENT PRIMARY KEY,
        crop_id INT,
        stage_name VARCHAR(100) NOT NULL,
        day_offset INT,
        FOREIGN KEY (crop_id) REFERENCES CROPS(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // 5. PLANTING_REQUESTS
    await db.query(`
      CREATE TABLE PLANTING_REQUESTS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        farmer_id INT,
        crop_id INT,
        land_size_acres FLOAT,
        expected_yield_kg FLOAT,
        planting_date DATE,
        expected_harvest_date DATE,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        region_name VARCHAR(100),
        status ENUM('Planted', 'Growing', 'Harvested') DEFAULT 'Planted',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (farmer_id) REFERENCES USERS(id),
        FOREIGN KEY (crop_id) REFERENCES CROPS(id)
      ) ENGINE=InnoDB;
    `);

    // 6. MARKETPLACE_ITEMS
    await db.query(`
      CREATE TABLE MARKETPLACE_ITEMS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        planting_request_id INT,
        available_quantity_kg FLOAT,
        listing_status ENUM('Active', 'Hidden', 'Sold Out') DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (planting_request_id) REFERENCES PLANTING_REQUESTS(id)
      ) ENGINE=InnoDB;
    `);

    // 7. ORDERS
    await db.query(`
      CREATE TABLE ORDERS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        buyer_id INT,
        marketplace_item_id INT,
        quantity_ordered_kg FLOAT,
        total_price FLOAT,
        checkout_request_id VARCHAR(100),
        mpesa_receipt_no VARCHAR(50),
        payment_phone_number VARCHAR(20),
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        motorspeed_tracking_id VARCHAR(100),
        escrow_status ENUM('Pending', 'Paid', 'Delivered') DEFAULT 'Pending',
        FOREIGN KEY (buyer_id) REFERENCES USERS(id),
        FOREIGN KEY (marketplace_item_id) REFERENCES MARKETPLACE_ITEMS(id)
      ) ENGINE=InnoDB;
    `);

    console.log('✅ All tables created successfully.');

    // Seed User Types with requested IDs
    await db.query(`
      INSERT INTO USER_TYPES (id, role_name) VALUES 
      ('FRM', 'Farmer'), 
      ('BUY', 'Buyer'), 
      ('ADM', 'Admin')
    `);
    console.log('🌱 Seeded USER_TYPES with IDs: FRM, BUY, ADM.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database Initialization Failed:', error);
    process.exit(1);
  }
};

initSchema();
