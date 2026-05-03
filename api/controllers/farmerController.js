import db from '../db.js';

const getFarmerDashboard = async (req, res) => {
  const farmer_id = req.user.id;

  try {
    // 1. Get Summary Stats
    const [stats] = await db.query(
      `SELECT 
        COUNT(id) as total_plantings,
        SUM(CASE WHEN status = 'Planted' OR status = 'Growing' THEN 1 ELSE 0 END) as active_plantings,
        SUM(expected_yield_kg) as total_expected_yield
       FROM planting_requests 
       WHERE farmer_id = ?`,
      [farmer_id]
    );

    // 2. Get Upcoming Events (Growth Stages in the next 7 days)
    const [upcomingEvents] = await db.query(
      `SELECT 
        gs.stage_name,
        DATE_ADD(pr.planting_date, INTERVAL gs.day_offset DAY) as event_date,
        c.crop_name,
        pr.id as planting_id,
        DATEDIFF(DATE_ADD(pr.planting_date, INTERVAL gs.day_offset DAY), CURDATE()) as days_remaining
       FROM planting_requests pr
       JOIN growth_stages gs ON pr.crop_id = gs.crop_id
       JOIN crops c ON pr.crop_id = c.id
       WHERE pr.farmer_id = ? 
       AND pr.status IN ('Planted', 'Growing')
       AND DATE_ADD(pr.planting_date, INTERVAL gs.day_offset DAY) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
       ORDER BY event_date ASC`,
      [farmer_id]
    );

    res.json({
      data: {
        summary: stats[0],
        upcoming_events: upcomingEvents
      }
    });
  } catch (error) {
    console.error('Error fetching farmer dashboard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Returns all orders placed on the marketplace items belonging to this farmer.
 */
const getFarmerOrders = async (req, res) => {
  const farmer_id = req.user.id;

  try {
    const [orders] = await db.query(
      `SELECT 
        o.*,
        c.crop_name,
        u.full_name as buyer_name,
        u.phone_number as buyer_phone,
        pr.expected_harvest_date,
        pr.region_name
       FROM orders o
       JOIN marketplace_items mi ON o.marketplace_item_id = mi.id
       JOIN planting_requests pr ON mi.planting_request_id = pr.id
       JOIN crops c ON pr.crop_id = c.id
       JOIN users u ON o.buyer_id = u.id
       WHERE pr.farmer_id = ?
       ORDER BY o.created_at DESC`,
      [farmer_id]
    );

    res.json({ data: orders });
  } catch (error) {
    console.error('Error fetching farmer orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default { getFarmerDashboard, getFarmerOrders };
