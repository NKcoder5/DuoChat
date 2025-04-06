const express = require('express');
const router = express.Router();
const Message = require('../models/message');

// Send a message
router.post('/send', async (req, res) => {
  try {
    const { senderId, receiverId, messageText } = req.body;
    const newMessage = new Message({ senderId, receiverId, messageText });
    await newMessage.save();
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
