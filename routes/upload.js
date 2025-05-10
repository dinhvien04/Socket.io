const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const path = require('path');

// Route upload file
router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file nào được upload' });
        }

        // Trả về URL và tên file gốc
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            url: fileUrl,
            originalName: req.file.originalname
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Lỗi khi upload file' });
    }
});

module.exports = router; 