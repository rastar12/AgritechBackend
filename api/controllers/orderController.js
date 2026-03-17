import db from '../db.js';
import mpesaController from './mpesaController.js';

/**
 * Places a new order and initiates M-Pesa STK Push.
 */
const placeOrder = async (req, res) => {
  const { marketplace_item_id, quantity, phone_number } = req.body;
  const buyer_id = req.user.id;

  if (!phone_number.match(/^254\d{9}$/)) {
    return res.status(400).json({ message: 'Invalid phone number. Format: 254XXXXXXXXX' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Process Order via Stored Procedure
    // CALL ProcessOrder(p_buyer_id, p_marketplace_item_id, p_quantity, p_phone_number, @p_order_id)
    await connection.query('SET @p_order_id = 0');
    await connection.query(
      'CALL ProcessOrder(?, ?, ?, ?, @p_order_id)',
      [buyer_id, marketplace_item_id, quantity, phone_number]
    );
    
    const [[{ order_id }]] = await connection.query('SELECT @p_order_id AS order_id');

    if (!order_id) {
      throw new Error('Failed to create order');
    }

    // 2. Fetch the total price for STK Push
    const [[order]] = await connection.query('SELECT total_price FROM orders WHERE id = ?', [order_id]);
    
    await connection.commit();

    // 3. Initiate STK Push
    // We pass req/res to a helper in mpesaController or handle it here.
    // To keep it clean, let's call the STK push logic directly.
    const stkResponse = await mpesaController.initiateStkPush(phone_number, order.total_price, order_id);

    res.status(201).json({
      message: 'Order placed. Please complete payment on your phone.',
      order_id,
      mpesa_response: stkResponse
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error placing order:', error);
    
    // Handle specific MySQL errors (like SIGNALs from the procedure)
    if (error.sqlState === '45000') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    connection.release();
  }
};

export default { placeOrder };
