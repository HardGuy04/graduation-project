import env from '../config/env.js';
import AppError from '../utils/AppError.js';

/**
 * Gọi AI_SERVICE để gợi ý chẩn đoán bệnh và danh mục thuốc dựa trên triệu chứng.
 *
 * @param {Object} params
 * @param {string} params.symptoms - Mô tả triệu chứng lâm sàng
 * @param {string} [params.diagnosis] - Chẩn đoán sơ bộ của bác sĩ (tuỳ chọn)
 * @param {Object} [params.patient] - Thông tin bệnh nhân (tuổi, giới tính, tiền sử dị ứng)
 * @param {number} [params.topK=5] - Số lượng bệnh nghi vấn tối đa cần trả về
 * @returns {Promise<Object>} Kết quả dự đoán bệnh và thuốc từ CDSS
 */
export async function predictDisease({ symptoms, diagnosis, patient, topK = 5 }) {
  const symText = (typeof symptoms === 'string' && symptoms.trim()) || (typeof diagnosis === 'string' && diagnosis.trim()) || '';
  if (!symText || symText.length < 2) {
    throw new AppError(400, 'INVALID_INPUT', 'Vui lòng nhập mô tả triệu chứng hoặc chẩn đoán (tối thiểu 2 ký tự)');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(`${env.AI_SERVICE_URL}/internal/predict-disease`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': env.AI_INTERNAL_KEY,
      },
      body: JSON.stringify({
        symptoms: symText,
        diagnosis: (typeof diagnosis === 'string' ? diagnosis.trim() : ''),
        patient: patient || null,
        topK: Number(topK) || 5,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let errorBody = {};
      try {
        errorBody = await res.json();
      } catch {
        // ignore parse error
      }

      if (res.status === 401) {
        throw new AppError(500, 'AI_AUTH_ERROR', 'Xác thực nội bộ với dịch vụ AI không thành công');
      }
      if (res.status === 422) {
        const msg = errorBody.message || 'Dữ liệu triệu chứng không hợp lệ';
        throw new AppError(400, 'INVALID_INPUT', msg);
      }
      if (res.status === 503) {
        throw new AppError(503, 'AI_NOT_READY', 'Mô hình AI đang nạp, vui lòng thử lại sau vài giây');
      }

      const message = errorBody.message || `Dịch vụ AI trả về mã lỗi ${res.status}`;
      throw new AppError(502, 'AI_SERVICE_ERROR', message);
    }

    const json = await res.json();
    return json.data || json;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.name === 'AbortError') {
      throw new AppError(504, 'AI_TIMEOUT', 'Yêu cầu AI quá thời gian chờ (15 giây)');
    }
    throw new AppError(502, 'AI_UNAVAILABLE', 'Không thể kết nối đến máy chủ AI (:8000). Vui lòng đảm bảo AI_SERVICE đang chạy.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tra cứu danh mục thuốc điều trị (phác đồ Hàng 1, Hàng 2) theo tên bệnh đã chẩn đoán.
 *
 * @param {Object} params
 * @param {string} params.disease - Tên bệnh lý cần tra cứu thuốc
 * @returns {Promise<Object>} Danh mục thuốc điều trị kèm liều lượng, hướng dẫn và thông tin bệnh
 */
export async function getMedicinesByDisease({ disease }) {
  const disText = typeof disease === 'string' ? disease.trim() : '';
  if (!disText) {
    return { found: false, totalMedicines: 0, medicines: [] };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${env.AI_SERVICE_URL}/internal/medicines-by-disease?disease=${encodeURIComponent(disText)}`, {
      method: 'GET',
      headers: {
        'X-Internal-Key': env.AI_INTERNAL_KEY,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      let errorBody = {};
      try {
        errorBody = await res.json();
      } catch {
        // ignore parse error
      }
      const message = errorBody.message || `Dịch vụ AI trả về mã lỗi ${res.status}`;
      throw new AppError(502, 'AI_SERVICE_ERROR', message);
    }

    const json = await res.json();
    return json.data || json;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.name === 'AbortError') {
      throw new AppError(504, 'AI_TIMEOUT', 'Yêu cầu tra cứu thuốc quá thời gian chờ (10 giây)');
    }
    throw new AppError(502, 'AI_UNAVAILABLE', 'Không thể kết nối đến máy chủ AI (:8000). Vui lòng đảm bảo AI_SERVICE đang chạy.');
  } finally {
    clearTimeout(timer);
  }
}

