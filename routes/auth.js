const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // Generate token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Email không tồn tại' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Mật khẩu không đúng' });
        // Đánh dấu user online (tùy chọn, có thể giữ hoặc bỏ)
        user.isOnline = true;
        await user.save();
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({
            user: {
                username: user.username,
                email: user.email,
                id: user._id
            },
            token
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Đăng xuất (API)
router.post('/logout', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user) {
            user.isOnline = false;
            await user.save();
        }
        res.json({ message: 'Đã đăng xuất' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify token
router.get('/verify', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id || req.user.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user: { username: user.username, email: user.email, id: user._id } });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 