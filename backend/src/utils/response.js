// ─────────────────────────────────────────────────────────────────────────────
// Response helper — thống nhất format trả về { success, message, data }
// Giữ đúng contract đã dùng trong mockApi.js của frontend
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trả response thành công
 */
const ok = (res, data = null, message = 'Thành công', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Trả response lỗi
 */
const fail = (res, message = 'Đã có lỗi xảy ra', statusCode = 400, errors = null) => {
  const body = {
    success: false,
    message,
  };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

/**
 * Trả response phân trang (mở rộng cho các API list)
 */
const paginate = (res, { rows, total, page, limit }, message = 'Thành công') => {
  return res.status(200).json({
    success: true,
    message,
    data: rows,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
};

module.exports = { ok, fail, paginate };
