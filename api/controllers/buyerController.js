import db from '../db.js';

/**
 * Returns a list of all active crops with basic info for the marketplace.
 * Fields: id, crop_name, image_url, description
 */
const getMarketplaceCrops = async (req, res) => {
  try {
    const [crops] = await db.query(
      'SELECT id, crop_name, image_url, description FROM crops WHERE is_active = TRUE'
    );
    res.json({ data: crops });
  } catch (error) {
    console.error('Error fetching marketplace crops:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Returns all marketplace items for a specific crop ID.
 * Includes availability date (expected_harvest_date) and listing status.
 */
const getItemsByCropId = async (req, res) => {
  const { id } = req.params; // crop_id

  try {
    // We join marketplace_items with planting_requests to get harvest date and region
    const [items] = await db.query(
      `SELECT 
        mi.id,
        mi.available_quantity_kg,
        mi.price_per_kg,
        mi.listing_status,
        pr.expected_harvest_date,
        pr.region_name,
        pr.status as planting_status,
        u.full_name as farmer_name,
        c.crop_name,
        c.image_url,
        c.description
       FROM marketplace_items mi
       JOIN planting_requests pr ON mi.planting_request_id = pr.id
       JOIN users u ON pr.farmer_id = u.id
       JOIN crops c ON pr.crop_id = c.id
       WHERE pr.crop_id = ? AND mi.listing_status = 'Active' AND mi.available_quantity_kg > 0
       ORDER BY pr.expected_harvest_date ASC`,
      [id]
    );

    res.json({ 
      crop_id: id,
      data: items 
    });
  } catch (error) {
    console.error('Error fetching items by crop:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Returns all orders for the authenticated buyer.
 * Joins with marketplace_items, planting_requests, and crops for full context.
 */
const getBuyerOrders = async (req, res) => {
  const buyer_id = req.user.id;

  try {
    const [orders] = await db.query(
      `SELECT 
        o.*,
        c.crop_name,
        c.image_url,
        pr.region_name,
        pr.expected_harvest_date
       FROM orders o
       JOIN marketplace_items mi ON o.marketplace_item_id = mi.id
       JOIN planting_requests pr ON mi.planting_request_id = pr.id
       JOIN crops c ON pr.crop_id = c.id
       WHERE o.buyer_id = ?
       ORDER BY o.created_at DESC`,
      [buyer_id]
    );

    res.json({ data: orders });
  } catch (error) {
    console.error('Error fetching buyer orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default { getMarketplaceCrops, getItemsByCropId, getBuyerOrders };
