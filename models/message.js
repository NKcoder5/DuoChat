const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    senderUsername: { type: String, required: true },
    receiverUsername: { type: String, required: true },
    messageText: { type: String },
    file: {
      url: String,
      name: String,
      type: String,
      size: Number
    },
    timestamp: { type: Date, default: Date.now }
  });

module.exports = mongoose.model('Message', MessageSchema);
