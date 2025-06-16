const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Multer config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Upload file/image
router.post('/upload', auth, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const type = imageExts.includes(ext) ? 'image' : 'file';
    res.json({ url: fileUrl, type });
});

// Hide message for current user
router.put('/:id/hide', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ error: 'Message not found' });
        // Nếu user đã ẩn rồi thì không thêm nữa
        if (!message.hiddenFor.includes(req.user.id)) {
            message.hiddenFor.push(req.user.id);
            await message.save();
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get message history (filter hidden)
router.get('/', auth, async (req, res) => {
    try {
        const messages = await Message.find({ hiddenFor: { $ne: req.user.id } })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('sender', 'username')
            .lean();

        res.json(messages.reverse());
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Send a new message
router.post('/', auth, async (req, res) => {
    try {
        const { content, type = 'text', room = 'general' } = req.body;

        const message = new Message({
            sender: req.user.id,
            content,
            type,
            room
        });

        await message.save();

        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'username')
            .lean();

        res.status(201).json(populatedMessage);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get messages by room
router.get('/room/:room', auth, async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.room })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('sender', 'username')
            .lean();

        res.json(messages.reverse());
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete message for everyone (only sender can delete)
router.delete('/:id', auth, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ error: 'Message not found' });
        if (String(message.sender) !== String(req.user.id)) {
            return res.status(403).json({ error: 'Bạn chỉ có thể xóa tin nhắn của chính mình.' });
        }
        await message.deleteOne();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Edit message (only sender can edit)
router.put('/:id', auth, async (req, res) => {
    try {
        const { content } = req.body;
        const message = await Message.findById(req.params.id);

        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (String(message.sender) !== String(req.user.id)) {
            return res.status(403).json({ error: 'Bạn chỉ có thể chỉnh sửa tin nhắn của chính mình.' });
        }

        message.content = content;
        message.edited = true;
        message.editedAt = new Date();
        await message.save();

        const updatedMessage = await Message.findById(message._id)
            .populate('sender', 'username')
            .lean();

        res.json(updatedMessage);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router; 