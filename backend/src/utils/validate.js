// Kiểm tra & làm sạch đầu vào, quy đổi thời gian/tiền tệ.
// Mọi hàm ném AppError 400 INVALID_INPUT với thông báo tiếng Việt khi dữ liệu sai.
import AppError from './AppError.js';
import env from '../config/env.js';

const bad = (message) => new AppError(400, 'INVALID_INPUT', message);
const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// PATCH cần phân biệt "không gửi" (giữ nguyên) với "gửi null" (xóa giá trị)
export const has = (obj, key) => obj != null && Object.prototype.hasOwnProperty.call(obj, key);

export function body(req) {
  const b = req.body;
  if (b === undefined) return {};
  if (b === null || typeof b !== 'object' || Array.isArray(b)) throw bad('Body phải là một đối tượng JSON');
  return b;
}

// ── Số ───────────────────────────────────────────────────────────────────────

export function id(v, field) {
  // Form/URL gửi id dạng chuỗi số; chỉ chấp nhận chữ số để tránh '1e3', ' 1', '1.0'
  const n = typeof v === 'string' && /^\d{1,15}$/.test(v) ? Number(v) : v;
  if (!Number.isSafeInteger(n) || n <= 0) throw bad(`${field} phải là số nguyên dương`);
  return n;
}

export const optionalId = (v, field) => (isBlank(v) ? null : id(v, field));

export function int(v, field, { min = 0, max = 1_000_000, required = true } = {}) {
  if (isBlank(v)) {
    if (required) throw bad(`${field} là bắt buộc`);
    return null;
  }
  const n = typeof v === 'string' && /^-?\d{1,9}$/.test(v) ? Number(v) : v;
  if (!Number.isInteger(n) || n < min || n > max) throw bad(`${field} phải là số nguyên từ ${min} đến ${max}`);
  return n;
}

// ── Chuỗi ────────────────────────────────────────────────────────────────────

export function str(v, field, { required = false, max = 255, min = 0 } = {}) {
  if (isBlank(v)) {
    if (required) throw bad(`${field} là bắt buộc`);
    return null;
  }
  if (typeof v !== 'string') throw bad(`${field} phải là chuỗi ký tự`);
  // Bỏ ký tự điều khiển (giữ tab/xuống dòng) để dữ liệu hiển thị an toàn trên web lẫn mobile
  const s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (s.length < min) throw bad(`${field} phải có ít nhất ${min} ký tự`);
  if (s.length > max) throw bad(`${field} tối đa ${max} ký tự`);
  return s;
}

export function email(v, field = 'email', { required = true } = {}) {
  const s = str(v, field, { required, max: 255 });
  if (s === null) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw bad(`${field} không hợp lệ`);
  return s.toLowerCase();
}

export function phone(v, field = 'phone', { required = false } = {}) {
  const s = str(v, field, { required, max: 20 });
  if (s === null) return null;
  const cleaned = s.replace(/[\s.-]/g, '');
  if (!/^\+?\d{8,15}$/.test(cleaned)) throw bad(`${field} không hợp lệ`);
  return cleaned;
}

export function username(v, field = 'username', { required = true } = {}) {
  const s = str(v, field, { required, max: 100 });
  if (s === null) return null;
  if (!/^[A-Za-z0-9._-]{3,50}$/.test(s)) throw bad(`${field} chỉ gồm chữ, số, dấu . _ - và dài 3–50 ký tự`);
  return s.toLowerCase();
}

export function password(v, field = 'password') {
  if (typeof v !== 'string' || v.length < 6) throw bad(`${field} phải có ít nhất 6 ký tự`);
  // bcrypt chỉ dùng 72 byte đầu; dài hơn sẽ bị cắt ngầm nên chặn luôn
  if (Buffer.byteLength(v, 'utf8') > 72) throw bad(`${field} quá dài (tối đa 72 byte)`);
  return v;
}

export function oneOf(v, field, list, { required = true } = {}) {
  if (isBlank(v)) {
    if (required) throw bad(`${field} là bắt buộc`);
    return null;
  }
  const s = typeof v === 'string' ? v.trim().toUpperCase() : v;
  if (!list.includes(s)) throw bad(`${field} phải là một trong: ${list.join(', ')}`);
  return s;
}

export function bool(v, field) {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === '1' || v === 1) return true;
  if (v === 'false' || v === '0' || v === 0) return false;
  throw bad(`${field} phải là true/false`);
}

// ── Ngày giờ ─────────────────────────────────────────────────────────────────

export function dateOnly(v, field, { required = true } = {}) {
  if (isBlank(v)) {
    if (required) throw bad(`${field} là bắt buộc`);
    return null;
  }
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw bad(`${field} phải có dạng YYYY-MM-DD`);
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Chặn ngày không tồn tại như 2026-02-30 (Date sẽ tự nhảy sang tháng sau)
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw bad(`${field} không phải ngày hợp lệ`);
  }
  return v;
}

export function monthOnly(v, field) {
  if (typeof v !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) throw bad(`${field} phải có dạng YYYY-MM`);
  return v;
}

export function timeOfDay(v, field) {
  if (typeof v !== 'string') throw bad(`${field} là bắt buộc (dạng HH:MM)`);
  const m = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(v.trim());
  if (!m) throw bad(`${field} phải có dạng HH:MM`);
  return `${m[1]}:${m[2]}:${m[3] || '00'}`;
}

// Bắt buộc có múi giờ (Z hoặc ±HH:MM) để không phụ thuộc giờ máy client
export function isoDateTime(v, field) {
  if (typeof v !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(v)) {
    throw bad(`${field} phải là thời gian ISO 8601 có múi giờ, ví dụ 2026-10-20T02:00:00Z`);
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw bad(`${field} không hợp lệ`);
  return d;
}

const pad = (n) => String(n).padStart(2, '0');

/** Date → 'YYYY-MM-DD HH:MM:SS' (UTC) để ghi vào cột DATETIME. */
export function toMysql(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** Chuỗi DATETIME (UTC) đọc từ DB → ISO 8601 UTC cho client. */
export function fromMysql(s) {
  return s ? `${s.replace(' ', 'T')}Z` : null;
}

/** Ngày + giờ địa phương phòng khám → Date (UTC). */
export function clinicToUtc(dateStr, timeStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi, s = 0] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi, s) - env.CLINIC_OFFSET_MINUTES * 60_000);
}

/** Date (UTC) → { date, time, dow } theo giờ phòng khám; dow: 1 = Thứ 2 ... 7 = Chủ nhật (như DB). */
export function utcToClinic(d) {
  const local = new Date(d.getTime() + env.CLINIC_OFFSET_MINUTES * 60_000);
  const jsDow = local.getUTCDay();
  return {
    date: `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}`,
    dow: jsDow === 0 ? 7 : jsDow,
  };
}

/** Khoảng [00:00, 24:00) của một ngày theo giờ phòng khám, quy ra UTC. */
export function clinicDayRange(dateStr) {
  const start = clinicToUtc(dateStr, '00:00:00');
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

export function dowOf(dateStr) {
  const js = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return js === 0 ? 7 : js;
}

export const todayClinic = () => utcToClinic(new Date()).date;

// ── Tiền ─────────────────────────────────────────────────────────────────────
// Làm việc bằng số nguyên "xu" (1/100 đồng) để không bị sai số dấu phẩy động; DB lưu DECIMAL(12,2).

const MAX_CENTS = 999_999_999_999; // 9.999.999.999,99 — giới hạn DECIMAL(12,2)

export function money(v, field, { min = 0 } = {}) {
  const s = typeof v === 'number' ? String(v) : v;
  if (typeof s !== 'string' || !/^\d{1,10}(\.\d{1,2})?$/.test(s.trim())) {
    throw bad(`${field} phải là số tiền không âm, tối đa 2 chữ số thập phân`);
  }
  const cents = decimalToCents(s.trim());
  if (cents < min || cents > MAX_CENTS) throw bad(`${field} nằm ngoài giới hạn cho phép`);
  return cents;
}

export function decimalToCents(s) {
  const [whole, frac = ''] = String(s).split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0').slice(0, 2));
}

export function centsToDecimal(c) {
  return `${Math.trunc(c / 100)}.${pad(c % 100)}`;
}

// ── Tìm kiếm ─────────────────────────────────────────────────────────────────

/** Chuỗi tìm kiếm → mẫu LIKE '%...%' (escape % và _ để người dùng không tạo wildcard). */
export function likePattern(q) {
  const s = str(q, 'q', { max: 100 });
  return s === null ? null : `%${s.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

// ── Phân trang ───────────────────────────────────────────────────────────────

export function pagination(query = {}) {
  const page = isBlank(query.page) ? 1 : int(query.page, 'page', { min: 1, max: 100_000 });
  const limit = isBlank(query.limit) ? 20 : int(query.limit, 'limit', { min: 1, max: 100 });
  return { page, limit, offset: (page - 1) * limit };
}
