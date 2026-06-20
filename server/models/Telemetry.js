const mongoose = require('mongoose');

const TelemetrySchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

// Create 2dsphere index for real-time spatial calculations
TelemetrySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Telemetry', TelemetrySchema);
