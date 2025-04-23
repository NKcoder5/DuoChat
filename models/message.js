const mongoose = require('mongoose');

// Define the schema
const MessageSchema = new mongoose.Schema({
  senderUsername: { type: String, required: true },
  receiverUsername: { type: String },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  messageText: { type: String },
  file: {
    url: { type: String },
    name: { type: String },
    type: { type: String },
    size: { type: Number }
  },
  timestamp: { type: Date, default: Date.now }
});

// Clear any existing model to avoid schema conflicts
if (mongoose.models.Message) {
  delete mongoose.models.Message;
}

module.exports = mongoose.model('Message', MessageSchema);