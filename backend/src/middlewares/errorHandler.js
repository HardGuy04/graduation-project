import AppError from '../utils/AppError.js';

/**
 * Error handler tập trung — phải đặt SAU tất cả route.
 * Format lỗi: { "error": { "code": "...", "message": "..." } }
 */
// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  // Lỗi do body-parser của Express
  if (err.type === 'entity.parse.failed') {
    return send(res, 400, 'INVALID_JSON', 'Body không phải JSON hợp lệ');
  }
  if (err.type === 'entity.too.large') {
    return send(res, 413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu gửi lên quá lớn');
  }

  // Lỗi ràng buộc MySQL lọt ra ngoài service — vẫn là lỗi của client, không phải 500
  switch (err.code) {
    case 'ER_DUP_ENTRY':
      return send(res, 409, 'DUPLICATE', 'Dữ liệu đã tồn tại');
    case 'ER_NO_REFERENCED_ROW_2':
      return send(res, 400, 'REFERENCE_NOT_FOUND', 'Dữ liệu tham chiếu không tồn tại');
    case 'ER_ROW_IS_REFERENCED_2':
      return send(res, 409, 'IN_USE', 'Dữ liệu đang được sử dụng, không thể xóa');
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return send(res, 400, 'CONSTRAINT_VIOLATED', 'Dữ liệu vi phạm ràng buộc hợp lệ');
    case 'ER_DATA_TOO_LONG':
    case 'ER_TRUNCATED_WRONG_VALUE':
    case 'WARN_DATA_TRUNCATED':
      return send(res, 400, 'INVALID_INPUT', 'Dữ liệu không hợp lệ hoặc quá dài');
    default:
      break;
  }

  // Không log err.sql: câu SQL đã được điền tham số, có thể chứa dữ liệu y tế
  console.error('[error]', { name: err.name, code: err.code, errno: err.errno, message: err.message });
  if (err.stack) console.error(err.stack);
  return send(res, 500, 'INTERNAL', 'Lỗi hệ thống, vui lòng thử lại sau');
}

function send(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}
