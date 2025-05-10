const multer = require('multer');
const path = require('path');

// Cấu hình storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        // Tạo tên file ngẫu nhiên + timestamp để tránh trùng
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Lọc file
const fileFilter = (req, file, cb) => {
    // Chấp nhận ảnh và file
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('application/')) {
        cb(null, true);
    } else {
        cb(new Error('Không hỗ trợ loại file này!'), false);
    }
};

// Cấu hình upload
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Giới hạn 5MB
    }
});

module.exports = upload; 