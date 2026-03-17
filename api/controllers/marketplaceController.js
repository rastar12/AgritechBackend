import db from '../db.js';

const getMyListings = async (req, res) => {
  const farmer_id = req.user.id;

  try {
    const [listings] = await db.query(
      `SELECT mi.*, pr.crop_id, pr.status as planting_status, c.crop_name, c.image_url 
       FROM marketplace_items mi
       JOIN planting_requests pr ON mi.planting_request_id = pr.id
       JOIN crops c ON pr.crop_id = c.id
       WHERE pr.farmer_id = ?`,
      [farmer_id]
    );

    res.json({ data: listings });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateListing = async (req, res) => {
  const { id } = req.params; // This is the marketplace_item id
  const { price_per_kg, listing_status } = req.body;
  const farmer_id = req.user.id;

  try {
    // 1. Verify ownership
    const [items] = await db.query(
      `SELECT mi.id 
       FROM marketplace_items mi
       JOIN planting_requests pr ON mi.planting_request_id = pr.id
       WHERE mi.id = ? AND pr.farmer_id = ?`,
      [id, farmer_id]
    );

    if (items.length === 0) {
      return res.status(404).json({ message: 'Listing not found or not owned by you' });
    }

    // 2. Update the listing
    // We only update fields provided in the request
    let query = 'UPDATE marketplace_items SET updated_at = NOW()';
    const params = [];

    if (price_per_kg !== undefined) {
      query += ', price_per_kg = ?';
      params.push(price_per_kg);
    }

    if (listing_status !== undefined) {
      query += ', listing_status = ?';
      params.push(listing_status);
      
      // If status is changed to Active, update the listed_date
      if (listing_status === 'Active') {
        query += ', listed_date = NOW()';
      }
    }

    query += ' WHERE id = ?';
    params.push(id);

    await db.query(query, params);

    res.json({ message: 'Marketplace listing updated successfully' });
  } catch (error) {
    console.error('Error updating listing:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getActiveMarketplace = async (req, res) => {
  try {
    const [items] = await db.query(
      `SELECT mi.*, pr.region_name, pr.expected_harvest_date, c.crop_name, c.image_url, u.full_name as farmer_name
       FROM marketplace_items mi
       JOIN planting_requests pr ON mi.planting_request_id = pr.id
       JOIN crops c ON pr.crop_id = c.id
       JOIN users u ON pr.farmer_id = u.id
       WHERE mi.listing_status = 'Active' AND mi.available_quantity_kg > 0`
    );

    res.json({ data: items });
  } catch (error) {
    console.error('Error fetching marketplace:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default { getMyListings, updateListing, getActiveMarketplace };
