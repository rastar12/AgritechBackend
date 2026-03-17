# Agritech Database Schema Documentation

This document outlines the database structure for the Agritech platform.

## DATABASE TABLES

### 1. user_types (Role Definitions)
- **id**: INT (Primary Key, Auto-increment)
- **role_name**: ENUM('Farmer', 'Buyer', 'Admin') (Unique)
- **created_at**: TIMESTAMP

### 2. users (Platform Members)
- **id**: INT (Primary Key, Auto-increment)
- **type_id**: INT (Foreign Key referencing user_types.id)
- **full_name**: VARCHAR(100)
- **email**: VARCHAR(100) (Unique)
- **phone_number**: VARCHAR(20) (Unique)
- **password_hash**: VARCHAR(255)
- **is_active**: BOOLEAN (Default: TRUE)
- **last_login**: TIMESTAMP
- **created_at**: TIMESTAMP
- **updated_at**: TIMESTAMP

### 3. crops (Crop Templates)
- **id**: INT (Primary Key, Auto-increment)
- **crop_name**: VARCHAR(50) (Unique)
- **baseline_yield_per_acre**: DECIMAL(10,2)
- **total_maturity_days**: INT
- **price_per_kg**: DECIMAL(10,2)
- **image_url**: VARCHAR(255)
- **description**: TEXT
- **is_active**: BOOLEAN
- **created_at**: TIMESTAMP
- **updated_at**: TIMESTAMP

### 4. growth_stages (Crop Growth Milestones)
- **id**: INT (Primary Key, Auto-increment)
- **crop_id**: INT (Foreign Key referencing crops.id)
- **stage_name**: VARCHAR(100)
- **day_offset**: INT (Days from planting)
- **created_at**: TIMESTAMP

### 5. planting_requests (Core Farm Records)
- **id**: INT (Primary Key, Auto-increment)
- **farmer_id**: INT (Foreign Key referencing users.id)
- **crop_id**: INT (Foreign Key referencing crops.id)
- **land_size_acres**: DECIMAL(10,2)
- **expected_yield_kg**: DECIMAL(10,2)
- **planting_date**: DATE
- **expected_harvest_date**: DATE
- **latitude**: DECIMAL(10,8)
- **longitude**: DECIMAL(11,8)
- **region_name**: VARCHAR(100)
- **status**: ENUM('Pending', 'Planted', 'Growing', 'Harvested')
- **notes**: TEXT
- **created_at**: TIMESTAMP
- **updated_at**: TIMESTAMP

### 6. marketplace_items (Items for Sale)
- **id**: INT (Primary Key, Auto-increment)
- **planting_request_id**: INT (Unique, Foreign Key referencing planting_requests.id)
- **available_quantity_kg**: DECIMAL(10,2)
- **price_per_kg**: DECIMAL(10,2)
- **listing_status**: ENUM('Active', 'Hidden', 'Sold Out')
- **listed_date**: TIMESTAMP
- **sold_out_date**: TIMESTAMP
- **created_at**: TIMESTAMP
- **updated_at**: TIMESTAMP

### 7. orders (Unified Sales & Payment Records)
- **id**: INT (Primary Key, Auto-increment)
- **buyer_id**: INT (Foreign Key referencing users.id)
- **marketplace_item_id**: INT (Foreign Key referencing marketplace_items.id)
- **quantity_ordered_kg**: DECIMAL(10,2)
- **total_price**: DECIMAL(10,2)
- **checkout_request_id**: VARCHAR(100) (M-Pesa STK ID)
- **mpesa_receipt_no**: VARCHAR(50) (M-Pesa Receipt Number)
- **payment_phone_number**: VARCHAR(20)
- **transaction_date**: TIMESTAMP
- **motorspeed_tracking_id**: VARCHAR(100)
- **escrow_status**: ENUM('Pending', 'Paid', 'Delivered')
- **delivery_address**: TEXT
- **notes**: TEXT
- **created_at**: TIMESTAMP
- **updated_at**: TIMESTAMP

### 8. system_logs (Audit Trails)
- **id**: BIGINT (Primary Key, Auto-increment)
- **user_id**: INT (Foreign Key referencing users.id)
- **action**: VARCHAR(100)
- **entity_type**: VARCHAR(50)
- **entity_id**: INT
- **old_data**: JSON
- **new_data**: JSON
- **ip_address**: VARCHAR(45)
- **user_agent**: TEXT
- **created_at**: TIMESTAMP
