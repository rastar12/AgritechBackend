import express from 'express';
import farmerController from '../controllers/farmerController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard', authMiddleware.verifyToken, authMiddleware.isFarmer, farmerController.getFarmerDashboard);

export default router;
