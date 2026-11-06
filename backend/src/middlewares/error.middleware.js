// ─────────────────────────────────────────────────────────────────────────────
// Error handler tập trung — bắt tất cả lỗi throw ra từ route/controller
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  console.error('❌ Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Multer file-size / file-type errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File tải lên vượt quá kích thước cho phép (tối đa 5MB)',
    });
  }

  if (err.message && err.message.includes('Chỉ chấp nhận file ảnh')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // JWT errors (đã xử lý trong auth middleware, nhưng phòng trường hợp)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn',
    });
  }

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Dữ liệu đã tồn tại trong hệ thống',
    });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Lỗi máy chủ nội bộ';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
