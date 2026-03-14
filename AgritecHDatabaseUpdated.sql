CREATE DATABASE IF NOT EXISTS agri_marketplace;
USE agri_marketplace;

CREATE TABLE IF NOT EXISTS user_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_name ENUM('Farmer', 'Buyer', 'Admin') NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id) REFERENCES user_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS crops (
    id INT PRIMARY KEY AUTO_INCREMENT,
    crop_name VARCHAR(50) NOT NULL UNIQUE,
    baseline_yield_per_acre DECIMAL(10,2) NOT NULL,
    total_maturity_days INT NOT NULL,
    price_per_kg DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (total_maturity_days > 0),
    CHECK (baseline_yield_per_acre > 0),
    CHECK (price_per_kg >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS growth_stages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    crop_id INT NOT NULL,
    stage_name VARCHAR(100) NOT NULL,
    day_offset INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE CASCADE,
    CHECK (day_offset >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS planting_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    farmer_id INT NOT NULL,
    crop_id INT NOT NULL,
    land_size_acres DECIMAL(10,2) NOT NULL,
    expected_yield_kg DECIMAL(10,2) NOT NULL,
    planting_date DATE NOT NULL,
    expected_harvest_date DATE NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    region_name VARCHAR(100),
    status ENUM('Planted', 'Growing', 'Harvested') DEFAULT 'Planted',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (crop_id) REFERENCES crops(id) ON DELETE RESTRICT,
    CHECK (land_size_acres > 0),
    CHECK (expected_yield_kg >= 0),
    CHECK (planting_date <= expected_harvest_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS marketplace_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    planting_request_id INT NOT NULL UNIQUE,
    available_quantity_kg DECIMAL(10,2) NOT NULL,
    price_per_kg DECIMAL(10,2) NOT NULL,
    listing_status ENUM('Active', 'Hidden', 'Sold Out') DEFAULT 'Active',
    listed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sold_out_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (planting_request_id) REFERENCES planting_requests(id) ON DELETE CASCADE,
    CHECK (available_quantity_kg >= 0),
    CHECK (price_per_kg >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
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
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (marketplace_item_id) REFERENCES marketplace_items(id) ON DELETE RESTRICT,
    CHECK (quantity_ordered_kg > 0),
    CHECK (total_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS system_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    old_data JSON,
    new_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- VIEWS

CREATE OR REPLACE VIEW farmer_dashboard AS
SELECT 
    u.id AS farmer_id,
    u.full_name AS farmer_name,
    u.phone_number,
    pr.id AS planting_id,
    c.crop_name,
    pr.land_size_acres,
    pr.expected_yield_kg,
    pr.planting_date,
    pr.expected_harvest_date,
    pr.status,
    DATEDIFF(pr.expected_harvest_date, CURDATE()) AS days_to_harvest,
    mi.listing_status AS market_status,
    CASE 
        WHEN mi.id IS NOT NULL THEN 'Listed'
        ELSE 'Not Listed'
    END AS market_listed
FROM users u
JOIN planting_requests pr ON u.id = pr.farmer_id
JOIN crops c ON pr.crop_id = c.id
LEFT JOIN marketplace_items mi ON pr.id = mi.planting_request_id
WHERE u.type_id = (SELECT id FROM user_types WHERE role_name = 'Farmer');

CREATE OR REPLACE VIEW buyer_marketplace AS
SELECT 
    mi.id AS item_id,
    pr.id AS planting_id,
    u.full_name AS farmer_name,
    u.phone_number AS farmer_contact,
    c.crop_name,
    c.image_url,
    mi.available_quantity_kg,
    mi.price_per_kg,
    (mi.available_quantity_kg * mi.price_per_kg) AS total_value,
    pr.expected_harvest_date,
    pr.region_name,
    DATEDIFF(pr.expected_harvest_date, CURDATE()) AS days_to_harvest,
    pr.latitude,
    pr.longitude,
    mi.listing_status,
    mi.created_at AS listed_date
FROM marketplace_items mi
JOIN planting_requests pr ON mi.planting_request_id = pr.id
JOIN users u ON pr.farmer_id = u.id
JOIN crops c ON pr.crop_id = c.id
WHERE mi.listing_status = 'Active' 
  AND mi.available_quantity_kg > 0
  AND pr.expected_harvest_date > CURDATE();

CREATE OR REPLACE VIEW admin_overview AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE type_id = (SELECT id FROM user_types WHERE role_name = 'Farmer')) AS total_farmers,
    (SELECT COUNT(*) FROM users WHERE type_id = (SELECT id FROM user_types WHERE role_name = 'Buyer')) AS total_buyers,
    (SELECT COUNT(*) FROM planting_requests) AS total_plantings,
    (SELECT COUNT(*) FROM planting_requests WHERE status = 'Growing') AS active_plantings,
    (SELECT SUM(expected_yield_kg) FROM planting_requests WHERE status IN ('Planted', 'Growing')) AS total_expected_yield_kg,
    (SELECT SUM(land_size_acres) FROM planting_requests) AS total_land_cultivated,
    (SELECT COUNT(*) FROM marketplace_items WHERE listing_status = 'Active') AS active_listings,
    (SELECT COUNT(*) FROM orders) AS total_orders,
    (SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE escrow_status = 'Paid') AS total_sales_value,
    (SELECT COUNT(*) FROM orders WHERE escrow_status = 'Pending') AS pending_orders,
    (SELECT COUNT(*) FROM orders WHERE escrow_status = 'Delivered') AS delivered_orders;

CREATE OR REPLACE VIEW crop_performance AS
SELECT 
    c.id AS crop_id,
    c.crop_name,
    COUNT(pr.id) AS total_plantings,
    SUM(pr.land_size_acres) AS total_land_used,
    AVG(pr.expected_yield_kg / pr.land_size_acres) AS avg_yield_per_acre,
    SUM(pr.expected_yield_kg) AS total_expected_yield,
    COUNT(DISTINCT pr.farmer_id) AS unique_farmers,
    COUNT(mi.id) AS total_listings,
    COUNT(o.id) AS total_sales
FROM crops c
LEFT JOIN planting_requests pr ON c.id = pr.crop_id
LEFT JOIN marketplace_items mi ON pr.id = mi.planting_request_id
LEFT JOIN orders o ON mi.id = o.marketplace_item_id
GROUP BY c.id, c.crop_name;

CREATE OR REPLACE VIEW regional_production AS
SELECT 
    pr.region_name,
    COUNT(DISTINCT pr.farmer_id) AS farmers_count,
    COUNT(pr.id) AS plantings_count,
    SUM(pr.land_size_acres) AS total_land,
    SUM(pr.expected_yield_kg) AS expected_yield,
    GROUP_CONCAT(DISTINCT c.crop_name) AS crops_grown
FROM planting_requests pr
JOIN crops c ON pr.crop_id = c.id
WHERE pr.region_name IS NOT NULL
GROUP BY pr.region_name;


-- STORED PROCEDURES

DELIMITER //

DROP PROCEDURE IF EXISTS CalculateExpectedYield//
CREATE PROCEDURE CalculateExpectedYield(
    IN p_crop_id INT,
    IN p_land_size DECIMAL(10,2),
    OUT p_expected_yield DECIMAL(10,2)
)
BEGIN
    DECLARE v_baseline_yield DECIMAL(10,2);
    
    SELECT baseline_yield_per_acre INTO v_baseline_yield
    FROM crops
    WHERE id = p_crop_id;
    
    SET p_expected_yield = v_baseline_yield * p_land_size;
END//

DROP PROCEDURE IF EXISTS CreatePlantingRequest//
CREATE PROCEDURE CreatePlantingRequest(
    IN p_farmer_id INT,
    IN p_crop_id INT,
    IN p_land_size DECIMAL(10,2),
    IN p_planting_date DATE,
    IN p_latitude DECIMAL(10,8),
    IN p_longitude DECIMAL(11,8),
    IN p_region_name VARCHAR(100),
    OUT p_planting_id INT
)
BEGIN
    DECLARE v_maturity_days INT;
    DECLARE v_expected_yield DECIMAL(10,2);
    DECLARE v_harvest_date DATE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    SELECT total_maturity_days, baseline_yield_per_acre 
    INTO v_maturity_days, v_expected_yield
    FROM crops 
    WHERE id = p_crop_id;
    
    SET v_expected_yield = v_expected_yield * p_land_size;
    SET v_harvest_date = DATE_ADD(p_planting_date, INTERVAL v_maturity_days DAY);
    
    INSERT INTO planting_requests (
        farmer_id, crop_id, land_size_acres, expected_yield_kg,
        planting_date, expected_harvest_date, latitude, longitude, region_name
    ) VALUES (
        p_farmer_id, p_crop_id, p_land_size, v_expected_yield,
        p_planting_date, v_harvest_date, p_latitude, p_longitude, p_region_name
    );
    
    SET p_planting_id = LAST_INSERT_ID();
    
    COMMIT;
END//

DROP PROCEDURE IF EXISTS CreateMarketplaceListing//
CREATE PROCEDURE CreateMarketplaceListing(
    IN p_planting_request_id INT,
    IN p_price_per_kg DECIMAL(10,2)
)
BEGIN
    DECLARE v_expected_yield DECIMAL(10,2);
    DECLARE v_status VARCHAR(20);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    SELECT expected_yield_kg, status 
    INTO v_expected_yield, v_status
    FROM planting_requests 
    WHERE id = p_planting_request_id;
    
    IF v_status = 'Harvested' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot list harvested crop';
    END IF;
    
    INSERT INTO marketplace_items (
        planting_request_id, 
        available_quantity_kg, 
        price_per_kg
    ) VALUES (
        p_planting_request_id,
        v_expected_yield,
        p_price_per_kg
    );
    
    COMMIT;
END//

DROP PROCEDURE IF EXISTS ProcessOrder//
CREATE PROCEDURE ProcessOrder(
    IN p_buyer_id INT,
    IN p_marketplace_item_id INT,
    IN p_quantity DECIMAL(10,2),
    IN p_phone_number VARCHAR(20),
    OUT p_order_id INT
)
BEGIN
    DECLARE v_available_qty DECIMAL(10,2);
    DECLARE v_price_per_kg DECIMAL(10,2);
    DECLARE v_total_price DECIMAL(10,2);
    DECLARE v_listing_status VARCHAR(20);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    SELECT available_quantity_kg, price_per_kg, listing_status
    INTO v_available_qty, v_price_per_kg, v_listing_status
    FROM marketplace_items
    WHERE id = p_marketplace_item_id
    FOR UPDATE;
    
    IF v_listing_status != 'Active' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Listing is not active';
    END IF;
    
    IF p_quantity > v_available_qty THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient quantity available';
    END IF;
    
    SET v_total_price = p_quantity * v_price_per_kg;
    
    INSERT INTO orders (
        buyer_id, 
        marketplace_item_id, 
        quantity_ordered_kg, 
        total_price, 
        payment_phone_number
    ) VALUES (
        p_buyer_id,
        p_marketplace_item_id,
        p_quantity,
        v_total_price,
        p_phone_number
    );
    
    SET p_order_id = LAST_INSERT_ID();
    
    UPDATE marketplace_items 
    SET available_quantity_kg = available_quantity_kg - p_quantity
    WHERE id = p_marketplace_item_id;
    
    UPDATE marketplace_items 
    SET listing_status = 'Sold Out',
        sold_out_date = NOW()
    WHERE id = p_marketplace_item_id 
    AND available_quantity_kg <= 0;
    
    COMMIT;
END//

DROP PROCEDURE IF EXISTS UpdateOrderPayment//
CREATE PROCEDURE UpdateOrderPayment(
    IN p_order_id INT,
    IN p_mpesa_receipt VARCHAR(50),
    IN p_checkout_request_id VARCHAR(100)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    UPDATE orders 
    SET 
        mpesa_receipt_no = p_mpesa_receipt,
        checkout_request_id = p_checkout_request_id,
        transaction_date = NOW(),
        escrow_status = 'Paid'
    WHERE id = p_order_id;
    
    COMMIT;
END//

DELIMITER ;


-- TRIGGERS

DELIMITER //

DROP TRIGGER IF EXISTS update_planting_status//
CREATE TRIGGER update_planting_status
BEFORE UPDATE ON planting_requests
FOR EACH ROW
BEGIN
    IF NEW.expected_harvest_date < CURDATE() AND NEW.status != 'Harvested' THEN
        SET NEW.status = 'Harvested';
    ELSEIF NEW.planting_date <= CURDATE() AND NEW.expected_harvest_date >= CURDATE() AND NEW.status = 'Planted' THEN
        SET NEW.status = 'Growing';
    END IF;
END//

DELIMITER ;



-- INDEXES

CREATE INDEX idx_users_type_id ON users(type_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);

CREATE INDEX idx_planting_farmer ON planting_requests(farmer_id);
CREATE INDEX idx_planting_crop ON planting_requests(crop_id);
CREATE INDEX idx_planting_status ON planting_requests(status);
CREATE INDEX idx_planting_dates ON planting_requests(planting_date, expected_harvest_date);
CREATE INDEX idx_planting_region ON planting_requests(region_name);

CREATE INDEX idx_marketplace_status ON marketplace_items(listing_status);
CREATE INDEX idx_marketplace_planting ON marketplace_items(planting_request_id);
CREATE INDEX idx_marketplace_created ON marketplace_items(created_at);

CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_item ON orders(marketplace_item_id);
CREATE INDEX idx_orders_escrow ON orders(escrow_status);
CREATE INDEX idx_orders_mpesa ON orders(mpesa_receipt_no);
CREATE INDEX idx_orders_tracking ON orders(motorspeed_tracking_id);
CREATE INDEX idx_orders_created ON orders(created_at);
