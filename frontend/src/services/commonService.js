import http, { unwrap } from "../api/http";
import { toUiDoctor } from "../api/adapters";
import { apiChatbotMessage } from "../mock/mockApi";

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
  sendMessage: (payload) => apiChatbotMessage(payload),
};
