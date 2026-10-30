// Nhận 1 file ảnh đại diện (field "avatar") vào bộ nhớ; kiểm tra nội dung thật nằm ở avatar.service.
import multer from 'multer';
import AppError from '../utils/AppError.js';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1, fields: 0 },
});

export function uploadAvatar(req, res, next) {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'FILE_TOO_LARGE', 'Ảnh tối đa 2MB'));
    return next(new AppError(400, 'INVALID_UPLOAD', 'Tệp tải lên không hợp lệ'));
  });
}
