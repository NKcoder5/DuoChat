const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const Group = require('../models/group');
const { verifyToken } = require('./auth');

// Send a direct message
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { senderUsername, receiverUsername, messageText, file } = req.body;

    console.log('Received message data:', req.body);

    const newMessage = new Message({
      senderUsername,
      receiverUsername,
      messageText,
      ...(file && { file })
    });

    const savedMessage = await newMessage.save();
    console.log('Saved message:', savedMessage);

    if (req.io) {
      req.io.emit('receiveMessage', savedMessage);
    } else {
      console.warn('Socket.IO not available, message not emitted');
    }

    res.status(201).json({ message: 'Message sent successfully', data: savedMessage });
  } catch (error) {
    console.error('Error sending message:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

// Send a group message
router.post('/send-group', verifyToken, async (req, res) => {
  try {
    const { senderUsername, groupId, messageText, file } = req.body;

    // Check if user is a member of the group
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(senderUsername)) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const newMessage = new Message({
      senderUsername,
      groupId,
      messageText,
      ...(file && { file })
    });

    const savedMessage = await newMessage.save();

    if (req.io) {
      req.io.emit('receiveMessage', { ...savedMessage.toObject(), members: group.members });
    }

    res.status(201).json({ message: 'Message sent successfully', data: savedMessage });
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Delete a message
router.delete('/:messageId', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const username = req.user.username;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is authorized to delete the message
    if (message.senderUsername !== username) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    // If it's a group message, verify the user is still a member of the group
    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (!group || !group.members.includes(username)) {
        return res.status(403).json({ error: 'You are not a member of this group' });
      }
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.emit('messageDeleted', { messageId });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;