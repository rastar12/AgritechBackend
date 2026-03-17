import db from '../db.js';

const getAllCrops = async (req, res) => {
  try {
    const [crops] = await db.query(
      'SELECT id, crop_name, baseline_yield_per_acre, total_maturity_days, price_per_kg, image_url, description FROM crops WHERE is_active = TRUE'
    );
    res.json({ data: crops });
  } catch (error) {
    console.error('Error fetching crops:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getCropById = async (req, res) => {
  const { id } = req.params;
  try {
    const [crops] = await db.query('SELECT * FROM crops WHERE id = ?', [id]);
    if (crops.length === 0) {
      return res.status(404).json({ message: 'Crop not found' });
    }
    res.json({ data: crops[0] });
  } catch (error) {
    console.error('Error fetching crop details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default { getAllCrops, getCropById };
