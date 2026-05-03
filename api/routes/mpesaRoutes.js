import express from 'express';
import mpesaController from '../controllers/mpesaController.js';

const router = express.Router();

// Public routes for M-Pesa callbacks
router.post('/callback', mpesaController.stkCallback);
router.post('/b2c-result', mpesaController.b2cResult);
router.post('/b2c-timeout', mpesaController.b2cTimeout);

export default router;
