import { apiGetSpecialties, apiGetPublicDoctors, apiChatbotMessage } from "../mock/mockApi";

export const commonService = {
  getSpecialties: () => apiGetSpecialties(),
  getPublicDoctors: (filters) => apiGetPublicDoctors(filters),
};

export const chatbotService = {
  sendMessage: (payload) => apiChatbotMessage(payload),
};
