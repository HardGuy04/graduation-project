// ─────────────────────────────────────────────────────────────────────────────
// Multer config — upload file (avatar bác sĩ / bệnh nhân)
// ─────────────────────────────────────────────────────────────────────────────
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('./env');

// Đảm bảo thư mục upload tồn tại
const uploadDir = path.resolve(__dirname, '../../', env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const isValid = allowed.test(path.extname(file.originalname).toLowerCase())
    && allowed.test(file.mimetype.split('/')[1]);
  cb(isValid ? null : new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp)'), isValid);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = upload;
