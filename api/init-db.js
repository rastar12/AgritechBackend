import db from './db.js';

const initSchema = async () => {
  try {
    console.log('🚀 Starting database initialization (Self-Contained with Logs)...');

    // 1. Drop existing tables in reverse order of dependency
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    await db.query('DROP TABLE IF EXISTS system_logs');
    await db.query('DROP TABLE IF EXISTS orders');
    await db.query('DROP TABLE IF EXISTS marketplace_items');
    await db.query('DROP TABLE IF EXISTS planting_requests');
    await db.query('DROP TABLE IF EXISTS growth_stages');
    await db.query('DROP TABLE IF EXISTS users');
    await db.query('DROP TABLE IF EXISTS crops');
    await db.query('DROP TABLE IF EXISTS user_types');
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('🗑️  Existing tables dropped.');

    // 2. Create Tables Directly

    // user_types
    await db.query(`
      CREATE TABLE user_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_name ENUM('Farmer', 'Buyer', 'Admin') NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // crops
    await db.query(`
      CREATE TABLE crops (
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

    // growth_stages
    await db.query(`
      CREATE TABLE growth_stages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        crop_id INT NOT NULL,
        stage_name VARCHAR(100) NOT NULL,
        day_offset INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_growth_stages_crop FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // users
    await db.query(`
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type_id INT NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_users_type FOREIGN KEY (type_id) REFERENCES user_types(id)
      ) ENGINE=InnoDB;
    `);

    // planting_requests
    await db.query(`
      CREATE TABLE planting_requests (
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
        CONSTRAINT fk_planting_farmer FOREIGN KEY (farmer_id) REFERENCES users(id),
        CONSTRAINT fk_planting_crop FOREIGN KEY (crop_id) REFERENCES crops(id)
      ) ENGINE=InnoDB;
    `);

    // marketplace_items
    await db.query(`
      CREATE TABLE marketplace_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        planting_request_id INT NOT NULL UNIQUE,
        available_quantity_kg DECIMAL(10,2) NOT NULL,
        price_per_kg DECIMAL(10,2) NOT NULL,
        listing_status ENUM('Active', 'Hidden', 'Sold Out') DEFAULT 'Active',
        listed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sold_out_date TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_marketplace_planting FOREIGN KEY (planting_request_id) REFERENCES planting_requests(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;
    `);

    // orders
    await db.query(`
      CREATE TABLE orders (
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
        CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES users(id),
        CONSTRAINT fk_orders_item FOREIGN KEY (marketplace_item_id) REFERENCES marketplace_items(id)
      ) ENGINE=InnoDB;
    `);

    // system_logs
    await db.query(`
      CREATE TABLE system_logs (
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
        CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    console.log('✅ All core tables (including system_logs) created.');

    // 3. Seed User Types
    await db.query(`INSERT INTO user_types (role_name) VALUES ('Farmer'), ('Buyer'), ('Admin')`);
    console.log('🌱 Seeded user_types: Farmer, Buyer, Admin.');

    console.log('✨ Database initialization successful.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Initialization Failed:', error);
    process.exit(1);
  }
};

initSchema();
