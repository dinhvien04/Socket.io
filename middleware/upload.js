const multer = require('multer');
const path = require('path');

// Hàm xử lý tên file tiếng Việt
function sanitizeFileName(fileName) {
    // Loại bỏ dấu và chuyển về ASCII
    return fileName.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_');
}

// Cấu hình storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        // Tạo tên file ngẫu nhiên + timestamp để tránh trùng
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = sanitizeFileName(path.parse(file.originalname).name);
        const ext = path.extname(file.originalname);
        cb(null, sanitizedName + '-' + uniqueSuffix + ext);
    }
});

// Lọc file
const fileFilter = (req, file, cb) => {
    if (
        file.mimetype.startsWith('image/') ||
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype.startsWith('audio/') // <-- Thêm dòng này để cho phép audio
    ) {
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
        fileSize: 10 * 1024 * 1024 // Giới hạn 10MB
    }
});

module.exports = upload; 