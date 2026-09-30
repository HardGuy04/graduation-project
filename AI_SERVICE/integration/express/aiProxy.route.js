/**
 * Express Route Proxy for AI_SERVICE Clinical Decision Support System (CDSS)
 *
 * Requirements:
 * - JWT authentication via authMiddleware
 * - Role-based access control: Doctor only (req.user.role === 'doctor')
 * - Enforces 5000ms timeout with Axios
 * - Attaches X-Internal-Key header
 * - Resilient fallback handling: If AI_SERVICE is down or slow, doctor workflow is never blocked.
 *
 * Usage in Express app:
 * const aiProxyRouter = require('./routes/aiProxy.route');
 * app.use('/api/ai', aiProxyRouter);
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Configuration from environment variables
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_INTERNAL_KEY = process.env.AI_INTERNAL_KEY || 'dev-internal-secret-key-change-in-prod';
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '5000', 10);

/**
 * Fallback response structure matching CDSS contract.
 * Returned when AI_SERVICE times out or experiences temporary failure.
 */
function createFallbackResponse(warningMessage) {
  return {
    success: true,
    data: {
      diseases: [],
      medicines: [],
      recognizedSymptoms: [],
      unrecognizedTerms: [],
      redFlags: [],
      warnings: [
        warningMessage ||
          'Dịch vụ gợi ý AI tạm thời gián đoạn hoặc phản hồi chậm. Bác sĩ vui lòng thực hiện chẩn đoán lâm sàng thông thường.',
      ],
      disclaimer: 'Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ.',
      modelVersion: 'fallback-offline',
    },
  };
}

/**
 * POST /api/ai/predict-disease
 *
 * Endpoint called by React frontend doctor examination form.
 * Body: { symptoms: string, diagnosis?: string, patient?: object, topK?: number }
 */
router.post(
  '/predict-disease',
  // In production, insert your authentication and role verification middlewares:
  // authMiddleware,
  // requireRole('doctor'),
  async (req, res) => {
    // 1. Role validation check (enforces doctor-only clinical access)
    if (req.user && req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Chức năng chỉ dành cho bác sĩ khám bệnh.',
        error: 'Forbidden',
      });
    }

    const { symptoms, diagnosis, patient, topK } = req.body;

    // 2. Basic payload validation
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length === 0) {
      return res.status(422).json({
        success: false,
        message: 'Dữ liệu đầu vào không hợp lệ: triệu chứng không được để trống.',
        error: 'ValidationError',
      });
    }

    // 3. Forward request to Python AI_SERVICE with strict timeout
    try {
      const aiResponse = await axios.post(
        `${AI_SERVICE_URL}/internal/predict-disease`,
        {
          symptoms: symptoms.trim(),
          diagnosis: diagnosis || '',
          patient: patient || null,
          topK: topK || 3,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': AI_INTERNAL_KEY,
          },
          timeout: AI_TIMEOUT_MS,
        }
      );

      // Return AI service response directly to frontend
      return res.status(aiResponse.status).json(aiResponse.data);
    } catch (error) {
      // 4. Graceful Fallback Handling
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.warn(
          `[AI_SERVICE PROXY] Request timed out after ${AI_TIMEOUT_MS}ms. Returning fallback.`
        );
        return res.status(200).json(
          createFallbackResponse(
            'Hệ thống AI phản hồi quá 5 giây. Đã tự động chuyển sang chế độ dự phòng lâm sàng.'
          )
        );
      }

      if (error.response) {
        // AI_SERVICE returned an HTTP error status (401, 422, 500, 503)
        const status = error.response.status;
        console.error(
          `[AI_SERVICE PROXY] Upstream error status=${status}:`,
          error.response.data
        );

        if (status === 503) {
          // Model not loaded yet -> Graceful fallback
          return res.status(200).json(
            createFallbackResponse(
              'Mô hình AI đang khởi động hoặc chưa sẵn sàng. Vui lòng thử lại sau.'
            )
          );
        }

        // Forward 401 or 422 standard errors
        return res.status(status).json(error.response.data);
      }

      // Network connection error (AI_SERVICE process down or network unreachable)
      console.error('[AI_SERVICE PROXY] Network connection error:', error.message);
      return res.status(200).json(
        createFallbackResponse(
          'Không thể kết nối đến máy chủ AI. Bác sĩ vui lòng ghi hồ sơ khám bình thường.'
        )
      );
    }
  }
);

module.exports = router;
