import express from 'express';
import buyerController from '../controllers/buyerController.js';
import orderController from '../controllers/orderController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Get list of crops for the marketplace (id, name, url, description)
router.get('/crops', buyerController.getMarketplaceCrops);

// Get all marketplace items for a specific crop ID
router.get('/crops/:id/items', buyerController.getItemsByCropId);

// Private routes: Buyers only
router.use(authMiddleware.verifyToken);
router.get('/orders', authMiddleware.isBuyer, buyerController.getBuyerOrders);
router.post('/orders/place', authMiddleware.isBuyer, orderController.placeOrder);

export default router;
