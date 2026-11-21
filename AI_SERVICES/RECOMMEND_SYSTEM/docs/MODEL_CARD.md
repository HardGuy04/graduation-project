# HỒ SƠ NĂNG LỰC MÔ HÌNH HỆ THỐNG (MODEL CARD)

> **Mô hình:** Calibrated CDSS Disease Suggestion & Medicine Ranking Model  
> **Phiên bản artifact:** `2026.10.0` | **Định dạng:** Scikit-Learn Pipeline (`model.joblib` 0.28 MB)  
> **Kiến trúc chính:** Bernoulli / Multinomial Naive Bayes hiệu chuẩn xác suất bằng Platt Scaling Sigmoid (`CalibratedClassifierCV`)  
> **Mục đích:** Hỗ trợ bác sĩ tham khảo gợi ý bệnh khả nghi và phác đồ thuốc tương ứng khi ghi hồ sơ khám bệnh.  

---

## 1. Nguồn Gốc và Bản Chất Tập Dữ Liệu (Dataset Origin & Nature)

### 1.1. Nguồn gốc
- **Tập dữ liệu raw:** Kaggle Disease-Symptom Benchmark Dataset (`dataset/Training.csv`).
- **Quy mô ma trận gốc:** 4,920 dòng × 133 cột (131 đặc trưng triệu chứng nhị phân 0/1, 1 cột nhãn bệnh `prognosis`).
- **Số lớp bệnh:** 41 bệnh lý thuộc 6 chuyên khoa phòng khám.
- **SHA-256 Checksum của tập raw:** `cc00c869b702c0c90eef3c1fb4d0b54f16965f8def2dec7e1bf91d0b76480ac3`.

### 1.2. Phát hiện kiểm toán dữ liệu quan trọng (Audit Findings)
1. **Dữ liệu tổng hợp quy tắc (Synthetic Textbook Data):**
   - Phân tích ở Phase 0b chỉ ra rằng 4,920 dòng thực chất chỉ chứa **304 tổ hợp triệu chứng duy nhất** (Tỉ lệ trùng lặp hoàn toàn đạt **93.82%**).
   - Mỗi bệnh lý được gán một tập hợp triệu chứng chuẩn (canonical textbook symptoms), sau đó nhân bản đều đặn 12–24 lần để đạt đúng 120 dòng/bệnh.
2. **Cảnh báo về Data Leakage và con số 100% giả tạo:**
   - Nếu áp dụng phương pháp chia ngẫu nhiên truyền thống (`train_test_split(test_size=0.2)` trên tập raw), 100% mẫu trong tập test thực chất đã nằm sẵn trong tập train. Mô hình sẽ đạt độ chính xác 100.00% ảo.
   - **Cam kết kỹ thuật trung thực:** Hệ thống tiến hành khử trùng lặp (deduplication) trước khi chia tập Stratified 70% Train (~212 ca), 15% Val (~46 ca), 15% Test (~46 ca), và chỉ chạy Data Augmentation trên tập Train.

---

## 2. Đo Lường và Hiệu Năng Thực Tế (Benchmark Metrics)

| Tập Kiểm Thử | Số Lượng Mẫu | Top-1 Accuracy | Top-3 Accuracy | Macro-F1 | Brier Score | Ghi Chú Đánh Giá |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Clean Test** (`test.csv`) | 41 mẫu duy nhất | **100.00%** | **100.00%** | **1.0000** | **0.0045** | Ca bệnh sách giáo khoa chuẩn, không rò rỉ |
| **Noisy Test** (`test_noisy.csv`) | 41 mẫu biến thể | **100.00%** | **100.00%** | **1.0000** | **0.0051** | Bác sĩ nhập thiếu 35% triệu chứng + nhiễu |
| **Golden Set Tiếng Việt** (`golden_cases.yaml`) | 50 ca lâm sàng | **62.00%** | **74.00%** | - | - | Văn bản tự nhiên có dấu, không dấu, lỗi gõ |

### Độ trễ suy luận (Inference Latency SLA)
- **Trung vị (p50):** `6.75 ms`
- **Phân vị 95 (p95):** `9.81 ms`
- **Cam kết SLA (< 300 ms trên dev, < 5000 ms timeout backend):** **ĐẠT (Vượt xa cam kết)**.

---

## 3. Giải Thích Điểm Xác Suất (Probability Interpretation)

> [!WARNING] CẢNH BÁO QUAN TRỌNG VỀ ĐIỂM SỐ XÁC SUẤT:
> Điểm số `probability` trả về trong phản hồi API (`0 - 100`) là **Model Relevance Score (Điểm tương quan thống kê của mô hình)**, **KHÔNG PHẢI LÀ XÁC SUẤT LÂM SÀNG DỊCH TỄ HỌC THỰC TẾ (True Clinical Probability)**.
>
> - Xác suất lâm sàng ngoài đời phụ thuộc vào: tuổi tác, yếu tố dịch tễ địa phương, mùa bệnh, xét nghiệm cận lâm sàng, tiền sử gia đình.
> - Điểm số của mô hình chỉ phản ánh mức độ trùng khớp giữa tổ hợp triệu chứng người dùng nhập vào với các mẫu bệnh lý đã học trong cơ sở dữ liệu.
> - Front-end và Back-end phải luôn hiển thị điểm số kèm nhãn *"Độ tương quan"* hoặc *"Điểm gợi ý"*, không được ghi *"Khả năng mắc bệnh X%"*.

---

## 4. Cơ Chế An Toàn Lâm Sàng (Clinical Safety Guardrails)

Hệ thống được thiết kế theo nguyên tắc: **Đúng contract $\rightarrow$ An toàn $\rightarrow$ Giải thích được $\rightarrow$ Đo lường trung thực $\rightarrow$ Thông minh**.

1. **Phát hiện dấu hiệu nguy cấp độc lập (Safety Red Flags):**
   - Hoạt động tách biệt hoàn toàn với mô hình phân loại.
   - Nhận diện các triệu chứng đe dọa tính mạng: Hội chứng vành cấp/Nhồi máu cơ tim, Đột quỵ não cấp (FAST), Suy hô hấp, Xuất huyết tiêu hóa, Hôn mê, Viêm màng não, Co giật.
   - Kích hoạt cảnh báo đỏ khẩn cấp trong `redFlags` để bác sĩ xử trí ngay.
2. **Quy tắc dừng khẩn cấp (Clinical Fallback):**
   - Nếu số triệu chứng nhận diện được dưới 2 hoặc điểm tin cậy top-1 dưới 30%, hệ thống **trả về danh sách bệnh rỗng** kèm cảnh báo: *"Thông tin triệu chứng chưa đủ để gợi ý bệnh chính xác"*, tuyệt đối không đoán mò.
3. **Cơ sở tri thức thuốc (Knowledge Base Governance):**
   - Mô hình AI **không bao giờ tự sinh tên thuốc**. Danh sách thuốc được truy xuất và xếp hạng từ cơ sở dữ liệu `medicines.csv` và `disease_medicine.csv` đã qua rà soát y khoa.
   - Không tự ý quyết định liều lượng cụ thể. Bác sĩ xác định liều lượng theo thể trạng bệnh nhân.
   - Kiểm tra chống chỉ định và dị ứng chéo (`patient.allergies`): gắn cảnh báo nổi bật vào `medicine.warnings`, không tự ý xóa thuốc để đảm bảo tính minh bạch cho bác sĩ.
4. **Tuyên bố miễn trừ trách nhiệm pháp lý bắt buộc (Mandatory Legal Disclaimer):**
   - Mọi phản hồi API đều bắt buộc chứa thông điệp:
   > *"Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ."*

---

## 5. Giới Hạn Của Mô Hình và Khuyến Cáo Sử Dụng

1. **Phạm vi danh mục bệnh:** Mô hình được huấn luyện trên 41 bệnh lý thuộc 6 chuyên khoa (Nội tổng quát, Nhi khoa, Da liễu, Tai Mũi Họng, Tim mạch, Cơ xương khớp). Không chẩn đoán được các bệnh hiếm, bệnh ung thư, hoặc các chấn thương ngoại khoa.
2. **Bệnh đồng mắc phức tạp:** Bệnh nhân mắc đồng thời nhiều bệnh mạn tính (ví dụ vừa đái tháo đường, vừa tăng huyết áp, vừa suy thận) có thể tạo ra các tổ hợp triệu chứng gây phân tán điểm số của mô hình.
3. **Môi trường hoạt động:** Chỉ dùng cho mục đích hỗ trợ quyết định lâm sàng nội bộ (Clinical Decision Support System - CDSS) dưới sự giám sát trực tiếp của Bác sĩ có chứng chỉ hành nghề. Tuyệt đối không dùng làm ứng dụng tự khám bệnh cho bệnh nhân (Self-diagnosis app).
