import db from '../db.js';
import mpesaController from './mpesaController.js';

/**
 * Places a new order and initiates M-Pesa STK Push.
 */
const placeOrder = async (req, res) => {
  const { marketplace_item_id, quantity, phone_number, delivery_address } = req.body;
  const buyer_id = req.user.id;

  if (!phone_number.match(/^254\d{9}$/)) {
    return res.status(400).json({ message: 'Invalid phone number. Format: 254XXXXXXXXX' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Process Order via Stored Procedure
    await connection.query('SET @p_order_id = 0');
    await connection.query(
      'CALL ProcessOrder(?, ?, ?, ?, ?, @p_order_id)',
      [buyer_id, marketplace_item_id, quantity, phone_number, delivery_address]
    );
    
    const [[{ order_id }]] = await connection.query('SELECT @p_order_id AS order_id');

    if (!order_id) {
      throw new Error('Failed to create order');
    }

    // 2. Fetch the total price for STK Push
    const [[order]] = await connection.query('SELECT total_price FROM orders WHERE id = ?', [order_id]);
    
    await connection.commit();

    // 3. Initiate STK Push
    const stkResponse = await mpesaController.initiateStkPush(phone_number, order.total_price, order_id);

    res.status(201).json({
      message: 'Order placed. Please complete payment on your phone.',
      order_id,
      mpesa_response: stkResponse
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error placing order:', error);
    
    if (error.sqlState === '45000') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    connection.release();
  }
};

/**
 * Confirms delivery and releases funds to the farmer.
 * Can be triggered by the Buyer or an Admin override.
 */
const confirmDelivery = async (req, res) => {
  const { order_id } = req.params;
  const buyer_id = req.user.id;
  const isAdmin = req.user.role === 'Admin';

  try {
    // 1. Fetch order details and farmer phone number
    const [orders] = await db.query(
      `SELECT o.*, u.phone_number as farmer_phone 
       FROM orders o
       JOIN marketplace_items mi ON o.marketplace_item_id = mi.id
       JOIN planting_requests pr ON mi.planting_request_id = pr.id
       JOIN users u ON pr.farmer_id = u.id
       WHERE o.id = ? ${isAdmin ? '' : 'AND o.buyer_id = ?'}`,
      isAdmin ? [order_id] : [order_id, buyer_id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found or not authorized' });
    }

    const order = orders[0];

    if (order.escrow_status !== 'Paid') {
      return res.status(400).json({ message: 'Order payment is not in escrow or already released' });
    }

    // 2. Trigger B2C Payout to Farmer
    const platformFeePercent = 0.05;
    const payoutAmount = order.total_price * (1 - platformFeePercent);
    
    await mpesaController.initiateB2CPayout(order.farmer_phone, payoutAmount, order_id);

    // 3. Update order status
    await db.query(
      "UPDATE orders SET escrow_status = 'Released' WHERE id = ?",
      [order_id]
    );

    res.json({ 
      message: isAdmin ? 'Admin Override: Delivery confirmed and funds released.' : 'Delivery confirmed. Funds have been released.',
      payout_amount: payoutAmount,
      released_by: isAdmin ? 'Admin' : 'Buyer'
    });

  } catch (error) {
    console.error('Error confirming delivery:', error);
    res.status(500).json({ message: 'Internal server error during fund release' });
  }
};

export default { placeOrder, confirmDelivery };
