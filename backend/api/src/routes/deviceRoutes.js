import express from 'express';
import { registerDeviceToken } from '../controllers/deviceController.js';
import { authenticate } from '../middleware/auth.js';
import { deviceLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// POST /api/devices/register
router.post('/register', authenticate, deviceLimiter, registerDeviceToken);

export default router;