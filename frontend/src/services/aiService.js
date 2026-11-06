import http, { unwrap } from "../api/http";
import { apiAiPredictDisease } from "../mock/mockApi";

// Đặt false để gọi API thật qua Backend (:5000) -> AI_SERVICE (:8000)
const USE_MOCK_PREDICT = false;

export const aiService = {
  askChatbot: async (message) => {
    const res = await http.post("/chatbot/message", { message });
    return unwrap(res);
  },

  predictDiseaseAndMedicine: async ({ symptoms, diagnosis }) => {
    if (USE_MOCK_PREDICT) {
      return apiAiPredictDisease({ symptoms, diagnosis });
    }
    const res = await http.post("/ai/predict-disease", { symptoms, diagnosis });
    const unwrapped = unwrap(res);
    return {
      success: true,
      data: unwrapped.data,
      ...unwrapped.data,
    };
  },

  getMedicinesByDisease: async (disease) => {
    if (!disease) return { medicines: [] };
    const res = await http.get("/ai/medicines-by-disease", {
      params: { disease },
    });
    const unwrapped = unwrap(res);
    return unwrapped.data;
  },
};

