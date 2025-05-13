const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// Cấu hình multer cho upload avatar
const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/avatars/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const avatarUpload = multer({
    storage: avatarStorage,
    fileFilter: function (req, file, cb) {
        // Chỉ chấp nhận file ảnh
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh!'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
    }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user.getPublicProfile());
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { fullName, bio } = req.body;
        const user = await User.findById(req.user.id);

        if (fullName !== undefined) user.fullName = fullName;
        if (bio !== undefined) user.bio = bio;

        await user.save();
        // Lấy lại user mới nhất từ DB
        const updatedUser = await User.findById(user._id);
        res.json(updatedUser.getPublicProfile());
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // Send email with reset link
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        // TODO: Implement email sending logic here

        res.json({ message: 'Đã gửi email khôi phục mật khẩu' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Mã khôi phục không hợp lệ hoặc đã hết hạn' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Đã đặt lại mật khẩu thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// Upload avatar
router.post('/avatar', auth, avatarUpload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Không có file nào được upload' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        // Cập nhật avatar trong database
        user.avatar = req.file.filename;
        await user.save();

        res.json({
            message: 'Đã cập nhật ảnh đại diện',
            avatar: user.avatar
        });
    } catch (error) {
        console.error('Lỗi khi upload avatar:', error);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// Admin routes
// Get all users (admin only)
router.get('/all', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Không có quyền truy cập' });
        }

        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// Update user status (admin only)
router.put('/:userId/status', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Không có quyền truy cập' });
        }

        const { isActive } = req.body;
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        user.isActive = isActive;
        await user.save();

        res.json(user.getPublicProfile());
    } catch (error) {
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ message: 'Yêu cầu refresh token' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'Refresh token không hợp lệ' });
        }

        // Generate new access token
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('Lỗi refresh token:', error);
        res.status(401).json({ message: 'Refresh token không hợp lệ' });
    }
});

module.exports = router; 