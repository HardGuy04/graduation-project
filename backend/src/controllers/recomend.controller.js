import * as recommendService from '../services/recommned.service.js';
import { body } from '../utils/validate.js';
import { ok } from '../utils/response.js';

/**
 * POST /api/ai/predict-disease
 * Gợi ý bệnh và thuốc theo triệu chứng hỗ trợ Bác sĩ khám bệnh.
 */
export async function predictDisease(req, res) {
  const payload = body(req);
  const result = await recommendService.predictDisease({
    symptoms: payload.symptoms,
    diagnosis: payload.diagnosis,
    patient: payload.patient,
    topK: payload.topK,
  });

  ok(res, result);
}

/**
 * GET /api/ai/medicines-by-disease
 * Tra cứu danh mục thuốc điều trị phác đồ theo tên bệnh lý đã chẩn đoán.
 */
export async function getMedicinesByDisease(req, res) {
  const disease = req.query?.disease || '';
  const result = await recommendService.getMedicinesByDisease({ disease });

  ok(res, result);
}


