// Đơn thuốc: mỗi bệnh án tối đa 1 đơn (unique medical_record_id), chi tiết thuốc ở prescription_detail.
// Không có endpoint riêng — được gọi từ medicalRecord.service trong cùng transaction với bệnh án.
import AppError from '../utils/AppError.js';
import * as v from '../utils/validate.js';

const MAX_ITEMS = 50;

/** Kiểm tra đơn thuốc từ client. Chấp nhận cả `instruction` (tên frontend đang dùng) lẫn `usageInstruction`. */
export function parsePrescription(p) {
  if (p === null || typeof p !== 'object' || Array.isArray(p)) {
    throw new AppError(400, 'INVALID_INPUT', 'prescription phải là một đối tượng');
  }
  if (!Array.isArray(p.items) || p.items.length === 0 || p.items.length > MAX_ITEMS) {
    throw new AppError(400, 'INVALID_INPUT', `Đơn thuốc phải có từ 1 đến ${MAX_ITEMS} loại thuốc`);
  }
  const items = p.items.map((it, i) => {
    if (it === null || typeof it !== 'object') throw new AppError(400, 'INVALID_INPUT', `items[${i}] không hợp lệ`);
    return {
      medicine_name: v.str(it.medicineName ?? it.name, `items[${i}].medicineName`, { required: true, max: 255 }),
      dosage: v.str(it.dosage, `items[${i}].dosage`, { max: 255 }),
      quantity: v.int(it.quantity, `items[${i}].quantity`, { min: 1, max: 100_000 }),
      usage_instruction: v.str(it.usageInstruction ?? it.instruction, `items[${i}].usageInstruction`, { max: 255 }),
    };
  });
  return { note: v.str(p.note, 'prescription.note', { max: 255 }), items };
}

/** Tạo mới hoặc thay toàn bộ đơn thuốc của một bệnh án (gọi trong transaction, bệnh án đã được khóa). */
export async function writePrescription(conn, recordId, p) {
  const [existing] = await conn.query('SELECT id FROM prescription WHERE medical_record_id = ? FOR UPDATE', [recordId]);
  let pid;
  if (existing.length) {
    pid = existing[0].id;
    await conn.query('UPDATE prescription SET note = ? WHERE id = ?', [p.note, pid]);
    await conn.query('DELETE FROM prescription_detail WHERE prescription_id = ?', [pid]);
  } else {
    const [r] = await conn.query('INSERT INTO prescription (medical_record_id, note) VALUES (?, ?)', [recordId, p.note]);
    pid = r.insertId;
  }
  await conn.query(
    'INSERT INTO prescription_detail (prescription_id, medicine_name, dosage, quantity, usage_instruction) VALUES ?',
    [p.items.map((it) => [pid, it.medicine_name, it.dosage, it.quantity, it.usage_instruction])],
  );
  return pid;
}

/** Nạp chi tiết đơn cho nhiều bệnh án một lần (tránh N+1 truy vấn). Trả về Map<medical_record_id, prescription>. */
export async function loadPrescriptions(conn, recordIds) {
  const map = new Map();
  if (!recordIds.length) return map;
  const [rows] = await conn.query(
    `SELECT pr.id, pr.medical_record_id, pr.note,
            d.id AS item_id, d.medicine_name, d.dosage, d.quantity, d.usage_instruction
       FROM prescription pr LEFT JOIN prescription_detail d ON d.prescription_id = pr.id
      WHERE pr.medical_record_id IN (?) ORDER BY d.id`,
    [recordIds],
  );
  for (const r of rows) {
    if (!map.has(r.medical_record_id)) map.set(r.medical_record_id, { id: r.id, note: r.note, items: [] });
    if (r.item_id) {
      map.get(r.medical_record_id).items.push({
        id: r.item_id, medicineName: r.medicine_name, dosage: r.dosage,
        quantity: r.quantity, usageInstruction: r.usage_instruction,
      });
    }
  }
  return map;
}
