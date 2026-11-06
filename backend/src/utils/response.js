// Định dạng phản hồi thành công thống nhất cho web và mobile:
//   { data }                                   — một đối tượng
//   { data: [...], pagination: {...} }         — danh sách có phân trang
// Lỗi do errorHandler trả: { error: { code, message } }

export function ok(res, data, status = 200) {
  return res.status(status).json({ data });
}

export function created(res, data) {
  return ok(res, data, 201);
}

export function paginated(res, rows, { page, limit, total }) {
  return res.status(200).json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export function noContent(res) {
  return res.status(204).end();
}
