import express from 'express';
import mpesaController from '../controllers/mpesaController.js';

const router = express.Router();

// Public route for M-Pesa callback
router.post('/callback', mpesaController.stkCallback);

export default router;
