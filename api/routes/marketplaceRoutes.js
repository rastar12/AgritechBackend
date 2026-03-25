import express from 'express';
import marketplaceController from '../controllers/marketplaceController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route: Everyone (including buyers) can see active listings
router.get('/active', marketplaceController.getActiveMarketplace);
router.get('/item/:id', marketplaceController.getMarketplaceItemById);

// Private routes: Farmers only
router.use(authMiddleware.verifyToken);

router.get('/my-listings', authMiddleware.isFarmer, marketplaceController.getMyListings);
router.put('/update/:id', authMiddleware.isFarmer, marketplaceController.updateListing);

export default router;
