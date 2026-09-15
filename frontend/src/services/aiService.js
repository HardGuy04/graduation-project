// Lớp service này là điểm nối duy nhất cần sửa khi tích hợp BE + AI_SERVICE thật.
// Hiện tại gọi hàm mock để FE chạy độc lập trong lúc chờ AI_SERVICE huấn luyện xong.
//
// Khi có Back-end thật (theo đúng luồng đã thống nhất: FE -> BE (:5000) -> AI_SERVICE (:8000)):
//
//   predictDiseaseAndMedicine: ({ symptoms, diagnosis }) =>
//     httpClient.post("/ai/predict-disease", { symptoms, diagnosis }),
//
// Không cần sửa bất kỳ file nào trong `pages/` hay `components/` vì
// DoctorAppointmentDetail.jsx chỉ import và gọi qua `aiService`.
import { apiAiPredictDisease } from "../mock/mockApi";

export const aiService = {
  predictDiseaseAndMedicine: ({ symptoms, diagnosis }) => apiAiPredictDisease({ symptoms, diagnosis }),
};
