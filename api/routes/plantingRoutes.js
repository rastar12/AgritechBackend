import express from 'express';
import plantingController from '../controllers/plantingController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware.verifyToken);

router.post('/save', authMiddleware.isFarmer, plantingController.createPlantingRequest);
router.get('/my-plantings', authMiddleware.isFarmer, plantingController.getFarmerPlantings);
router.get('/details/:id', authMiddleware.isFarmer, plantingController.getPlantingDetails);

// Allow Admins or Farmers to update status
router.put('/update-status/:id', plantingController.updatePlantingStatus);

export default router;
