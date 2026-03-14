import db from '../db.js';

const createPlantingRequest = async (req, res) => {
  const { crop_id, land_size_acres, planting_date, latitude, longitude, region_name, notes } = req.body;
  const farmer_id = req.user.id;

  try {
    const [crops] = await db.query('SELECT total_maturity_days, baseline_yield_per_acre FROM CROPS WHERE id = ?', [crop_id]);
    if (crops.length === 0) {
      return res.status(404).json({ message: 'Crop not found' });
    }

    const { total_maturity_days, baseline_yield_per_acre } = crops[0];

    const expected_harvest_date = new Date(planting_date);
    expected_harvest_date.setDate(expected_harvest_date.getDate() + total_maturity_days);
    
    const expected_yield_kg = land_size_acres * baseline_yield_per_acre;

    const [result] = await db.query(
      `INSERT INTO PLANTING_REQUESTS 
       (farmer_id, crop_id, land_size_acres, expected_yield_kg, planting_date, expected_harvest_date, latitude, longitude, region_name, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
      [farmer_id, crop_id, land_size_acres, expected_yield_kg, planting_date, expected_harvest_date, latitude, longitude, region_name, notes]
    );

    res.status(201).json({
      message: 'Planting request submitted and is currently Pending',
      data: {
        id: result.insertId,
        farmer_id,
        crop_id,
        land_size_acres,
        expected_yield_kg,
        status: 'Pending'
      }
    });
  } catch (error) {
    console.error('Error saving planting request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updatePlantingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [plantings] = await connection.query(
        'SELECT status, crop_id, expected_yield_kg FROM PLANTING_REQUESTS WHERE id = ?', [id]
      );

      if (plantings.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Planting request not found' });
      }

      const oldStatus = plantings[0].status;
      await connection.query('UPDATE PLANTING_REQUESTS SET status = ? WHERE id = ?', [status, id]);

      if (status === 'Planted' && oldStatus !== 'Planted') {
        const [crops] = await connection.query('SELECT price_per_kg FROM CROPS WHERE id = ?', [plantings[0].crop_id]);
        const default_price = crops[0].price_per_kg;
        const [existing] = await connection.query('SELECT id FROM MARKETPLACE_ITEMS WHERE planting_request_id = ?', [id]);
        
        if (existing.length === 0) {
          await connection.query(
            `INSERT INTO MARKETPLACE_ITEMS (planting_request_id, available_quantity_kg, price_per_kg, listing_status) 
             VALUES (?, ?, ?, 'Hidden')`,
            [id, plantings[0].expected_yield_kg, default_price]
          );
        }
      }

      await connection.commit();
      res.json({ message: `Status updated to ${status}.` });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getFarmerPlantings = async (req, res) => {
  const farmer_id = req.user.id;
  try {
    const [plantings] = await db.query(
      `SELECT pr.*, c.crop_name, c.image_url 
       FROM PLANTING_REQUESTS pr 
       JOIN CROPS c ON pr.crop_id = c.id 
       WHERE pr.farmer_id = ? 
       ORDER BY pr.created_at DESC`,
      [farmer_id]
    );
    res.json({ data: plantings });
  } catch (error) {
    console.error('Error fetching plantings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getPlantingDetails = async (req, res) => {
  const { id } = req.params;
  const farmer_id = req.user.id;

  try {
    // 1. Get Core Planting Details
    const [plantings] = await db.query(
      `SELECT pr.*, c.crop_name, c.image_url, c.description as crop_description
       FROM PLANTING_REQUESTS pr
       JOIN CROPS c ON pr.crop_id = c.id
       WHERE pr.id = ? AND pr.farmer_id = ?`,
      [id, farmer_id]
    );

    if (plantings.length === 0) {
      return res.status(404).json({ message: 'Planting request not found' });
    }

    const planting = plantings[0];

    // 2. Get Growth Stages and calculate the duration-based calendar
    const [stages] = await db.query(
      'SELECT stage_name, day_offset FROM GROWTH_STAGES WHERE crop_id = ? ORDER BY day_offset ASC',
      [planting.crop_id]
    );

    let previousOffset = 0;
    const calendar = stages.map((stage) => {
      const startDay = previousOffset;
      const endDay = stage.day_offset;
      
      // Calculate actual calendar dates
      const startDate = new Date(planting.planting_date);
      startDate.setDate(startDate.getDate() + startDay);
      
      const endDate = new Date(planting.planting_date);
      endDate.setDate(endDate.getDate() + endDay);

      const duration = endDay - startDay;
      previousOffset = endDay;

      return {
        stage_name: stage.stage_name,
        start_day: startDay,
        end_day: endDay,
        duration_days: duration,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      };
    });

    res.json({
      data: {
        planting_info: planting,
        calendar: calendar
      }
    });

  } catch (error) {
    console.error('Error fetching planting details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default { 
  createPlantingRequest, 
  updatePlantingStatus, 
  getFarmerPlantings, 
  getPlantingDetails 
};
