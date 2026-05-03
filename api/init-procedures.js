import db from './db.js';

const initProcedures = async () => {
  try {
    console.log('🚀 Installing Stored Procedures...');

    // 1. ProcessOrder Procedure
    console.log('Creating ProcessOrder...');
    await db.query(`DROP PROCEDURE IF EXISTS ProcessOrder`);
    await db.query(`
      CREATE PROCEDURE ProcessOrder(
          IN p_buyer_id INT,
          IN p_marketplace_item_id INT,
          IN p_quantity DECIMAL(10,2),
          IN p_phone_number VARCHAR(20),
          IN p_delivery_address TEXT,
          OUT p_order_id INT
      )
      BEGIN
          DECLARE v_available_qty DECIMAL(10,2);
          DECLARE v_price_per_kg DECIMAL(10,2);
          DECLARE v_total_price DECIMAL(10,2);
          DECLARE v_listing_status VARCHAR(20);
          
          -- Use a block to handle errors and rollbacks manually if needed, 
          -- but we rely on the controller's transaction usually.
          -- However, procedures need their own error handling if they use transactions.
          
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
              payment_phone_number,
              delivery_address
          ) VALUES (
              p_buyer_id,
              p_marketplace_item_id,
              p_quantity,
              v_total_price,
              p_phone_number,
              p_delivery_address
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
          
      END
    `);

    // 2. UpdateOrderPayment Procedure
    console.log('Creating UpdateOrderPayment...');
    await db.query(`DROP PROCEDURE IF EXISTS UpdateOrderPayment`);
    await db.query(`
      CREATE PROCEDURE UpdateOrderPayment(
          IN p_order_id INT,
          IN p_mpesa_receipt VARCHAR(50),
          IN p_checkout_request_id VARCHAR(100)
      )
      BEGIN
          UPDATE orders 
          SET 
              mpesa_receipt_no = p_mpesa_receipt,
              checkout_request_id = p_checkout_request_id,
              transaction_date = NOW(),
              escrow_status = 'Paid'
          WHERE id = p_order_id;
      END
    `);

    console.log('✅ Procedures installed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to install procedures:', error.message);
    process.exit(1);
  }
};

initProcedures();
