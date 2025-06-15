const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const path = require('path');

// Hàm xử lý tên file tiếng Việt
function sanitizeFileName(fileName) {
    return fileName.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
}

// Route upload file
router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file nào được upload' });
        }

        // Xử lý tên file
        const originalName = req.file.originalname;
        const sanitizedName = sanitizeFileName(path.parse(originalName).name) + path.extname(originalName);

        // Trả về URL, tên file gốc và tên file đã lưu trên server
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            url: fileUrl,
            originalName: req.file.originalname,
            serverFileName: req.file.filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Lỗi khi upload file' });
    }
});

// module.exports = router;
module.exports = router;