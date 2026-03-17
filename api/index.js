import 'dotenv/config';
import express from 'express';
import db from './db.js';
import authRoutes from './routes/authRoutes.js';
import plantingRoutes from './routes/plantingRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import cropRoutes from './routes/cropRoutes.js';
import farmerRoutes from './routes/farmerRoutes.js';
import buyerRoutes from './routes/buyerRoutes.js';
import mpesaRoutes from './routes/mpesaRoutes.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/planting', plantingRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/buyer', buyerRoutes);
app.use('/api/mpesa', mpesaRoutes);

app.get('/health', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    res.json({ 
      status: 'ok', 
      database: 'connected', 
      result: rows[0].solution 
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
