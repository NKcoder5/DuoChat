const express = require('express');
const router = express.Router();
const Group = require('../models/group');
const Message = require('../models/message');
const { verifyToken } = require('./auth');

// Get all groups for the current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const username = req.user.username;
    const groups = await Group.find({ members: username });
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create a new group
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, members } = req.body;
    
    if (!name || !members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Group name and members are required' });
    }
    
    const newGroup = new Group({
      name,
      members
    });
    
    const savedGroup = await newGroup.save();
    res.status(201).json(savedGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Get messages for a specific group
router.get('/:groupId/messages', verifyToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const username = req.user.username;
    
    // Check if user is a member of the group
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }
    
    const messages = await Message.find({ groupId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching group messages:', error);
    res.status(500).json({ error: 'Failed to fetch group messages' });
  }
});

// Add members to an existing group
router.post('/:groupId/add-members', verifyToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { newMembers } = req.body;
    const username = req.user.username;
    
    if (!newMembers || !Array.isArray(newMembers) || newMembers.length === 0) {
      return res.status(400).json({ error: 'New members list is required' });
    }
    
    // Find the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Check if the user is a member of the group
    if (!group.members.includes(username)) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }
    
    // Add new members (avoid duplicates)
    const updatedMembers = [...new Set([...group.members, ...newMembers])];
    
    // Update the group
    group.members = updatedMembers;
    await group.save();
    
    res.json({ message: 'Members added successfully', group });
  } catch (error) {
    console.error('Error adding members to group:', error);
    res.status(500).json({ error: 'Failed to add members to group' });
  }
});

module.exports = router; 