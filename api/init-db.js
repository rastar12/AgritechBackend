import db from './db.js';

const initSchema = async () => {
  try {
    console.log('🚀 Starting database initialization (Self-Contained with Logs)...');

    // 1. Drop existing tables in reverse order of dependency
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('DROP TABLE IF EXISTS SYSTEM_LOGS');
    await db.query('DROP TABLE IF EXISTS ORDERS');
    await db.query('DROP TABLE IF EXISTS MARKETPLACE_ITEMS');
    await db.query('DROP TABLE IF EXISTS PLANTING_REQUESTS');
    await db.query('DROP TABLE IF EXISTS USERS');
    await db.query('DROP TABLE IF EXISTS CROPS');
    await db.query('DROP TABLE IF EXISTS USER_TYPES');
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('🗑️  Existing tables dropped.');

    // 2. Create Tables Directly

    // USER_TYPES
    await db.query(`
      CREATE TABLE USER_TYPES (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_name ENUM('Farmer', 'Buyer', 'Admin') NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // CROPS
    await db.query(`
      CREATE TABLE CROPS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        crop_name VARCHAR(50) NOT NULL UNIQUE,
        baseline_yield_per_acre DECIMAL(10,2) NOT NULL,
        total_maturity_days INT NOT NULL,
        price_per_kg DECIMAL(10,2) NOT NULL,
        image_url VARCHAR(255),
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // GROWTH_STAGES
    await db.query(`
      CREATE TABLE GROWTH_STAGES (
        id INT AUTO_INCREMENT PRIMARY KEY,
        crop_id INT NOT NULL,
        stage_name VARCHAR(100) NOT NULL,
        day_offset INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (crop_id) REFERENCES CROPS(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // USERS
    await db.query(`
      CREATE TABLE USERS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type_id INT NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (type_id) REFERENCES USER_TYPES(id)
      ) ENGINE=InnoDB;
    `);

    // PLANTING_REQUESTS
    await db.query(`
      CREATE TABLE PLANTING_REQUESTS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        farmer_id INT NOT NULL,
        crop_id INT NOT NULL,
        land_size_acres DECIMAL(10,2) NOT NULL,
        expected_yield_kg DECIMAL(10,2) NOT NULL,
        planting_date DATE NOT NULL,
        expected_harvest_date DATE NOT NULL,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        region_name VARCHAR(100),
        status ENUM('Pending', 'Planted', 'Growing', 'Harvested') DEFAULT 'Pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (farmer_id) REFERENCES USERS(id),
        FOREIGN KEY (crop_id) REFERENCES CROPS(id)
      ) ENGINE=InnoDB;
    `);

    // MARKETPLACE_ITEMS
    await db.query(`
      CREATE TABLE MARKETPLACE_ITEMS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        planting_request_id INT NOT NULL UNIQUE,
        available_quantity_kg DECIMAL(10,2) NOT NULL,
        price_per_kg DECIMAL(10,2) NOT NULL,
        listing_status ENUM('Active', 'Hidden', 'Sold Out') DEFAULT 'Active',
        listed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sold_out_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (planting_request_id) REFERENCES PLANTING_REQUESTS(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // ORDERS
    await db.query(`
      CREATE TABLE ORDERS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        buyer_id INT NOT NULL,
        marketplace_item_id INT NOT NULL,
        quantity_ordered_kg DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        checkout_request_id VARCHAR(100) UNIQUE,
        mpesa_receipt_no VARCHAR(50) UNIQUE,
        payment_phone_number VARCHAR(20),
        transaction_date TIMESTAMP NULL,
        motorspeed_tracking_id VARCHAR(100),
        escrow_status ENUM('Pending', 'Paid', 'Delivered') DEFAULT 'Pending',
        delivery_address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (buyer_id) REFERENCES USERS(id),
        FOREIGN KEY (marketplace_item_id) REFERENCES MARKETPLACE_ITEMS(id)
      ) ENGINE=InnoDB;
    `);

    // SYSTEM_LOGS (User Logs)
    await db.query(`
      CREATE TABLE SYSTEM_LOGS (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INT,
        old_data JSON,
        new_data JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES USERS(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    console.log('✅ All core tables (including SYSTEM_LOGS) created.');

    // 3. Seed User Types
    await db.query(`INSERT INTO USER_TYPES (role_name) VALUES ('Farmer'), ('Buyer'), ('Admin')`);
    console.log('🌱 Seeded USER_TYPES: Farmer, Buyer, Admin.');

    console.log('✨ Database initialization successful.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Initialization Failed:', error);
    process.exit(1);
  }
};

initSchema();
