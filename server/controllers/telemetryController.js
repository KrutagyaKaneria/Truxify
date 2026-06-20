const Telemetry = require('../models/Telemetry');

exports.updateDriverLocation = async (req, res) => {
  try {
    const { driverId, longitude, latitude, speed, heading } = req.body;

    if (!driverId || longitude == null || latitude == null) {
      return res.status(400).json({ success: false, message: 'Missing required tracking fields' });
    }

    const telemetry = await Telemetry.findOneAndUpdate(
      { driverId },
      {
        location: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
        speed: speed || 0,
        heading: heading || 0,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, data: telemetry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDriverLocation = async (req, res) => {
  try {
    const { driverId } = req.params;
    const trackingData = await Telemetry.findOne({ driverId });
    
    if (!trackingData) {
      return res.status(404).json({ success: false, message: 'No live telemetry found for this driver' });
    }
    
    res.status(200).json({ success: true, data: trackingData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
