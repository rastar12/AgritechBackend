import axios from "axios";
import db from '../db.js';

const generateAccessToken = async () => {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_SECRET_KEY;
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { authorization: `Basic ${auth}` } }
    );
    return response.data.access_token;
  } catch (err) {
    console.error("Failed to generate access token:", err.response?.data || err.message);
    throw new Error("Failed to generate M-Pesa access token");
  }
};

const initiateStkPush = async (phone, amount, order_id) => {
  const shortCode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const token = await generateAccessToken();

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);
  const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

  try {
    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(amount), // M-Pesa expects whole numbers or decimals depending on API version, keeping it safe
        PartyA: phone,
        PartyB: shortCode,
        PhoneNumber: phone,
        CallBackURL: process.env.CALLBACK_URL,
        AccountReference: `Order-${order_id}`,
        TransactionDesc: `Payment for Order ${order_id}`,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Save the CheckoutRequestID to the order
    await db.query(
      'UPDATE orders SET checkout_request_id = ? WHERE id = ?',
      [response.data.CheckoutRequestID, order_id]
    );

    return response.data;
  } catch (error) {
    console.error("STK Push Error:", error.response?.data || error.message);
    throw new Error("STK Push failed");
  }
};

const stkCallback = async (req, res) => {
  console.log("Callback Received:", JSON.stringify(req.body, null, 2));

  const result = req.body.Body?.stkCallback;
  if (!result) {
    console.error("Invalid callback data:", req.body);
    return res.status(400).json({ error: "Invalid callback data" });
  }

  const { CheckoutRequestID, ResultCode, CallbackMetadata } = result;

  if (ResultCode === 0 && CallbackMetadata) {
    const data = CallbackMetadata.Item;
    const mpesaReceipt = data.find((i) => i.Name === "MpesaReceiptNumber")?.Value;

    try {
        // Use the stored procedure to update the order
        // CALL UpdateOrderPayment(p_order_id, p_mpesa_receipt, p_checkout_request_id)
        // Since we only have CheckoutRequestID in the callback, we first find the order_id
        const [orders] = await db.query('SELECT id FROM orders WHERE checkout_request_id = ?', [CheckoutRequestID]);
        
        if (orders.length > 0) {
            const order_id = orders[0].id;
            await db.query(
                'CALL UpdateOrderPayment(?, ?, ?)',
                [order_id, mpesaReceipt, CheckoutRequestID]
            );
            console.log(`Order ${order_id} updated successfully with payment.`);
        } else {
            console.error(`No order found for CheckoutRequestID: ${CheckoutRequestID}`);
        }
    } catch (error) {
      console.error("Error Updating Order Payment:", error.message);
    }
  } else {
    console.log("Transaction Failed or Cancelled:", result.ResultDesc);
    // Optionally update order status to 'Failed'
  }

  res.status(200).json("ok");
};

export default { initiateStkPush, stkCallback };
