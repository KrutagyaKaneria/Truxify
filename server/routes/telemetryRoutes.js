const express = require('express');
const router = express.Router();
const { updateDriverLocation, getDriverLocation } = require('../controllers/telemetryController');

// Ingest location update stream
router.post('/location', updateDriverLocation);

// Fetch current active coordinate frame
router.get('/location/:driverId', getDriverLocation);

module.exports = router;
