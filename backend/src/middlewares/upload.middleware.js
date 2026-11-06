// ─────────────────────────────────────────────────────────────────────────────
// Upload middleware — wrapper cho multer, dùng cho route cần upload avatar
// ─────────────────────────────────────────────────────────────────────────────
const upload = require('../config/upload');

// Upload single avatar
const uploadAvatar = upload.single('avatar');

module.exports = { uploadAvatar };
