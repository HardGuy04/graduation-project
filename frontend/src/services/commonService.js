import http, { unwrap } from "../api/http";
import { toUiDoctor } from "../api/adapters";

export const commonService = {
  async getSpecialties() {
    const res = unwrap(await http.get("/specialties", { params: { limit: 100 } }));
    return { success: true, data: res.data };
  },
  async getPublicDoctors(filters = {}) {
    const res = unwrap(await http.get("/doctors", { params: { ...filters, limit: 100 } }));
    return { success: true, data: res.data.map(toUiDoctor) };
  },
};

export const chatbotService = {
  // Gọi BE thật: FE -> BE (:5000/api/chatbot/message) -> AI_SERVICE (:8000)
  // role và userId backend tự lấy từ token nên không cần gửi.
  // Trả về cùng dạng như mock cũ: { success, data: { reply, createdAt } }
  async sendMessage({ message }) {
    const res = unwrap(await http.post("/chatbot/message", { message }));
    return { success: true, data: res.data };
  },
};