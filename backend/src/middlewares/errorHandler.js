import AppError from '../utils/AppError.js';

/**
 * Error handler tập trung — phải đặt SAU tất cả route.
 * Format lỗi: { "error": { "code": "...", "message": "..." } }
 */
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, _req, res, _next) {
  // Lỗi nghiệp vụ đã biết → trả đúng status + code
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message },
    });
  }

  // Lỗi không xác định → log chi tiết, trả message chung (không lộ thông tin nội bộ)
  console.error(err);
  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Lỗi hệ thống' },
  });
}
