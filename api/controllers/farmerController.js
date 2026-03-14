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
       FROM PLANTING_REQUESTS 
       WHERE farmer_id = ?`,
      [farmer_id]
    );

    // 2. Get Upcoming Events (Growth Stages in the next 7 days)
    // Logic: 
    // Event Date = planting_date + day_offset
    // We want: Event Date is BETWEEN CURDATE() AND CURDATE() + 7
    const [upcomingEvents] = await db.query(
      `SELECT 
        gs.stage_name,
        DATE_ADD(pr.planting_date, INTERVAL gs.day_offset DAY) as event_date,
        c.crop_name,
        pr.id as planting_id,
        DATEDIFF(DATE_ADD(pr.planting_date, INTERVAL gs.day_offset DAY), CURDATE()) as days_remaining
       FROM PLANTING_REQUESTS pr
       JOIN GROWTH_STAGES gs ON pr.crop_id = gs.crop_id
       JOIN CROPS c ON pr.crop_id = c.id
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

export default { getFarmerDashboard };
