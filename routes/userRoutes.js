const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

const router = express.Router();

// Register User Route
router.post('/register', async(req, res) => {
    try {
        console.log("Received data:", req.body);

        const { username, email, password } = req.body;
        console.log(`Extracted Data - Username: ${username}, Email: ${email}, Password: ${password}`);

        if (!username || !email || !password) {
            console.log("⚠️ Missing fields!");
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log("⚠️ User already exists!");
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        console.log("User registered successfully!", newUser);

        // Send success response
        return res.status(201).json({ message: 'User registered successfully', user: newUser });

    } catch (error) {
        console.error("❌ Error registering user:", error);
        return res.status(500).json({ error: 'Error registering user' });
    }
});

module.exports = router;
