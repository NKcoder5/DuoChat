const mongoose = require('mongoose');

// Define the schema
const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: String, required: true }],
  createdAt: { type: Date, default: Date.now }
});

// Clear any existing model to avoid schema conflicts
if (mongoose.models.Group) {
  delete mongoose.models.Group;
}

module.exports = mongoose.model('Group', GroupSchema); 