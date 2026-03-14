import express from 'express';
import cropController from '../controllers/cropController.js';

const router = express.Router();

// Publicly accessible for Farmers and Buyers to browse
router.get('/all', cropController.getAllCrops);
router.get('/:id', cropController.getCropById);

export default router;
