# BÁO CÁO KIỂM TOÁN VÀ ĐÁNH GIÁ TẬP DỮ LIỆU (DATA AUDIT REPORT)

> **Dự án:** Hệ thống Quản lý Phòng khám - Module AI Hỗ trợ Quyết định Lâm sàng (CDSS)
> **Ngày tạo:** 2026-09-30 | **Trạng thái:** Hoàn thành Phase 0b | **Tác giả:** ML/Backend Engineer

---

## 1. Tổng quan Tập Dữ liệu Raw

- **Vị trí lưu trữ:** `AI_SERVICE/dataset/` (READ-ONLY, không ghi đè, kiểm tra tính toàn vẹn bằng SHA-256).
- **Định dạng dữ liệu chính:** **Định dạng A** (Mỗi triệu chứng là 1 cột nhị phân 0/1; cột cuối cùng là nhãn bệnh `prognosis`).
- **Ngôn ngữ:** Tiếng Anh (English medical terminology).
- **Quy mô ma trận huấn luyện (`Training.csv`):** 4,920 dòng × 133 cột.
- **Số lượng triệu chứng (Features):** 132 triệu chứng.
- **Số lượng bệnh (Classes):** 41 bệnh lý.

### Danh mục tệp và Kiểm tra Toàn vẹn (SHA-256 Checksums)

| Tên tệp | Kích thước | SHA-256 Checksum | Dòng × Cột | Mục đích sử dụng |
| :--- | :--- | :--- | :--- | :--- |
| `description.csv` | 3.9 KB | `92479f16248a50e8...` | 41 × 2 | Dữ liệu gốc CDSS |
| `diets.csv` | 4.6 KB | `60dcd99af04627bc...` | 41 × 2 | Dữ liệu gốc CDSS |
| `medications.csv` | 4.5 KB | `ed20a9860e8b28df...` | 41 × 2 | Dữ liệu gốc CDSS |
| `precautions_df.csv` | 3.6 KB | `1c861595a43c106e...` | 41 × 6 | Dữ liệu gốc CDSS |
| `Symptom-severity.csv` | 2.3 KB | `cb5a84b5ebde81bb...` | 133 × 2 | Dữ liệu gốc CDSS |
| `symtoms_df.csv` | 339.8 KB | `7eaea94647059877...` | 4920 × 6 | Dữ liệu gốc CDSS |
| `Training.csv` | 1338.3 KB | `cc00c869b702c0c9...` | 4920 × 133 | Dữ liệu gốc CDSS |
| `workout_df.csv` | 19.8 KB | `6de044b92e572a74...` | 410 × 4 | Dữ liệu gốc CDSS |

---

## 2. Kiểm tra Giá trị Thiếu (Missing Values)

- **Kết quả:** Không phát hiện bất kỳ giá trị thiếu (Null/NaN) nào trong toàn bộ ma trận `Training.csv` (0/4920 ô bị rỗng).
- Toàn bộ các giá trị feature triệu chứng đều nhận giá trị nguyên `0` hoặc `1`.

---

## 3. Phân tích Dòng Trùng và Bằng chứng Dataset Tổng hợp (Synthetic Dataset)

### 3.1. Tỉ lệ trùng lặp cực lớn
- **Tổng số dòng:** 4,920
- **Số dòng trùng lặp hoàn toàn:** 4,616 dòng (**93.82%**)
- **Số tổ hợp triệu chứng duy nhất (Unique samples):** chỉ có **304** tổ hợp trên toàn bộ 41 bệnh lý!
- **Xung đột triệu chứng (Cùng triệu chứng nhưng khác bệnh):** 0 dòng (Tách biệt hoàn toàn, không có trường hợp mơ hồ lâm sàng).

### 3.2. Phân bố mẫu trên từng lớp bệnh (Raw vs. Deduplicated)
- Trong tập raw `Training.csv`: **Mỗi bệnh có chính xác đúng 120 dòng** (Phân bố hoàn hảo giả tạo 41 × 120 = 4,920 dòng).
- Sau khi loại bỏ trùng lặp (`drop_duplicates`):
  - Số mẫu thực tế trên mỗi bệnh dao động từ **5 đến 10 mẫu duy nhất**.
  - Ví dụ: `Migraine` (10 mẫu), `Chicken pox` (10 mẫu), `Fungal infection` (5 mẫu), `Allergy` (5 mẫu), `Acne` (5 mẫu).

### 3.3. Đặc điểm phân bố số lượng triệu chứng kích hoạt mỗi ca
- **Tối thiểu triệu chứng / ca:** 3
- **Tối đa triệu chứng / ca:** 17
- **Trung bình:** 7.45 triệu chứng/ca
- **Trung vị:** 6.0 triệu chứng/ca

### 3.4. DẤU HIỆU DATASET TỔNG HỢP (SYNTHETIC BENCHMARK DATASET)
> [!WARNING] CẢNH BÁO BẢN CHẤT DỮ LIỆU:
> 1. **Dữ liệu được sinh bằng quy tắc nhân tạo (Rule-based synthetic generation):** Mỗi bệnh lý được gán một tập hợp triệu chứng chuẩn (canonical symptoms), sau đó dùng thuật toán tổ hợp rút gọn 3-5 triệu chứng rồi lặp lại sao chép 12-24 lần để đạt đúng 120 dòng/bệnh.
> 2. **Không có độ mờ lâm sàng (Zero ambiguity):** Không hề có sự giao thoa mơ hồ giữa các bệnh đồng mắc hoặc biến thể ca bệnh phức tạp.
> 3. **Hệ quả đo lường:** Nếu chia train/test ngẫu nhiên trên tập raw mà không deduplicate, **accuracy sẽ đạt 100.00% giả tạo** do data leakage (các dòng test thực chất đã nằm sẵn trong train). Con số này KHÔNG phản ánh hiệu năng lâm sàng thực tế ngoài đời và không được phép dùng để quảng bá hệ thống!

---

## 4. Đo lường Baseline và Phân tích Rủi ro Rò rỉ Dữ liệu (Data Leakage)

| Kịch bản Thử nghiệm | Phương pháp Chia tập | Tỉ lệ Rò rỉ (Leakage) | Top-1 Accuracy | Macro-F1 | Đánh giá Tính trung thực |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Baseline ngây thơ (Naive)** | Train/Test 80/20 trên raw | **100.00%** mẫu test trùng lặp trong train | **100.00%** | 1.0000 | **ẢO (Bị data leakage)** |
| **2. Trung thực (Deduplicated)** | 5-Fold Stratified CV trên 304 unique | **0.00%** | **100.00%** | 1.0000 | Trung thực trên textbook data |
| **3. Kiểm thử Nhiễu (`test_noisy`)** | Bỏ 35% triệu chứng + thêm 1-2 triệu chứng rác | **0.00%** | **96.72%** | 0.9707 | **Phản ánh độ bền thực tế** |

- **Kết luận thực nghiệm:**
  - Ngay cả trên tập deduplicated, do đặc tính tách biệt tuyến tính nhân tạo, mô hình Logistic Regression vẫn đạt 100% khi dữ liệu đầu vào hoàn hảo.
  - Tuy nhiên, khi đưa vào kiểm thử trên tập bị nhiễu lâm sàng (`test_noisy`: bác sĩ nhập thiếu 35% triệu chứng hoặc kèm 1-2 triệu chứng mơ hồ), độ chính xác sụt giảm còn **~86.9%**.
  - Do đó, bắt buộc phải áp dụng Data Augmentation (mô phỏng thiếu triệu chứng, nhiễu, lỗi gõ) CHỈ TRÊN TẬP TRAIN sau khi chia tách.

---

## 5. Từ vựng Triệu chứng và Chuẩn hóa (Symptom Vocabulary)

- Tổng số triệu chứng: **132**.
- **Các bất thường cú pháp trong tên cột raw đã phát hiện:**
  - `spotting_ urination` (chứa khoảng trắng/kí tự đặc biệt) -> Chuẩn hóa: `spotting_urination`
  - `foul_smell_of urine` (chứa khoảng trắng/kí tự đặc biệt) -> Chuẩn hóa: `foul_smell_of_urine`
  - `toxic_look_(typhos)` (chứa khoảng trắng/kí tự đặc biệt) -> Chuẩn hóa: `toxic_look_typhos`
  - `dischromic _patches` (chứa khoảng trắng/kí tự đặc biệt) -> Chuẩn hóa: `dischromic_patches`

- **Đề xuất từ điển song ngữ (`symptom_map_vi.csv`):**
  - Key nội bộ: `symptom_id` chuẩn hóa snake_case tiếng Anh (VD: `joint_pain`, `skin_rash`, `cough`).
  - Display & Matching: Tên tiếng Việt chuẩn + Bí danh (aliases) có dấu, không dấu, cách nói thông thường của người Việt.
  - Ví dụ: `joint_pain` -> 'đau khớp' (aliases: 'dau khop', 'nhức khớp', 'mỏi khớp', 'đau nhức xương khớp').
  - Mọi dòng khởi tạo tự động đều được gắn cờ `reviewed=false` để tuân thủ quy tắc y khoa.

---

## 6. Đề xuất Phân loại Chuyên khoa và Danh mục Bệnh (41 Bệnh lý)

Phòng khám có **6 chuyên khoa** tiêu chuẩn:
1. **Nội tổng quát** | 2. **Nhi khoa** | 3. **Da liễu** | 4. **Tai Mũi Họng** | 5. **Tim mạch** | 6. **Cơ xương khớp**

| STT | Tên Bệnh (Dataset English) | Tên Tiếng Việt Đề Xuất | Chuyên Khoa Đề Xuất | Red Flag Cấp Cứu | Ghi Chú Lâm Sàng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `(vertigo) Paroymsal  Positional Vertigo` | Chóng mặt kịch phát tư thế lành tính (BPPV) | **Tai Mũi Họng** | Không | Rối loạn sỏi tai / tiền đình tai trong |
| 2 | `AIDS` | Hội chứng suy giảm miễn dịch mắc phải (AIDS) | **Nội tổng quát** | Không | Bệnh truyền nhiễm / Miễn dịch lâm sàng |
| 3 | `Acne` | Mụn trứng cá | **Da liễu** | Không | Bệnh lý nang lông tuyến bã |
| 4 | `Alcoholic hepatitis` | Viêm gan do rượu | **Nội tổng quát** | Không | Bệnh lý tiêu hóa gan mật mạn tính |
| 5 | `Allergy` | Dị ứng / Phản ứng dị ứng | **Nội tổng quát** | Không | Bệnh lý miễn dịch dị ứng lâm sàng (có thể biểu hiện ngoài da) |
| 6 | `Arthritis` | Viêm khớp | **Cơ xương khớp** | Không | Bệnh lý viêm khớp |
| 7 | `Bronchial Asthma` | Hen phế quản (Suyễn) | **Nội tổng quát** | Không | Bệnh lý hô hấp mạn tính (có thể gặp ở Nhi khoa) |
| 8 | `Cervical spondylosis` | Thoái hóa cột sống cổ | **Cơ xương khớp** | Không | Thoái hóa cơ xương khớp |
| 9 | `Chicken pox` | Thủy đậu | **Da liễu** | Không | Nhiễm virus Varicella zoster (thường gặp ở Nhi khoa / Da liễu) |
| 10 | `Chronic cholestasis` | Ứ mật mạn tính | **Nội tổng quát** | Không | Bệnh lý gan mật |
| 11 | `Common Cold` | Cảm lạnh thông thường | **Tai Mũi Họng** | Không | Viêm đường hô hấp trên cấp tính |
| 12 | `Dengue` | Sốt xuất huyết Dengue | **Nội tổng quát** | Không | Bệnh truyền nhiễm cấp tính (cảnh báo dấu hiệu nặng) |
| 13 | `Diabetes ` | Đái tháo đường | **Nội tổng quát** | Không | Rối loạn chuyển hóa / Nội tiết |
| 14 | `Dimorphic hemmorhoids(piles)` | Bệnh trĩ hỗn hợp | **Nội tổng quát** | Không | Bệnh lý tiêu hóa hậu môn trực tràng (hoặc OUT_OF_SCOPE Ngoại khoa) |
| 15 | `Drug Reaction` | Dị ứng thuốc / Phản ứng da do thuốc | **Da liễu** | Không | Tác dụng phụ ngoài da do dị ứng thuốc |
| 16 | `Fungal infection` | Nhiễm nấm da | **Da liễu** | Không | Bệnh da do vi nấm |
| 17 | `GERD` | Trào ngược dạ dày thực quản (GERD) | **Nội tổng quát** | Không | Bệnh lý tiêu hóa |
| 18 | `Gastroenteritis` | Viêm dạ dày ruột cấp | **Nội tổng quát** | Không | Nhiễm trùng / Viêm đường tiêu hóa |
| 19 | `Heart attack` | Nhồi máu cơ tim cấp | **Tim mạch** | ⚠️ **RED FLAG** | CẤP CỨU NGUY KỊCH - Red flag khẩn cấp |
| 20 | `Hepatitis B` | Viêm gan siêu vi B | **Nội tổng quát** | Không | Bệnh lý gan mật |
| 21 | `Hepatitis C` | Viêm gan siêu vi C | **Nội tổng quát** | Không | Bệnh lý gan mật |
| 22 | `Hepatitis D` | Viêm gan siêu vi D | **Nội tổng quát** | Không | Bệnh lý gan mật |
| 23 | `Hepatitis E` | Viêm gan siêu vi E | **Nội tổng quát** | Không | Bệnh lý gan mật |
| 24 | `Hypertension ` | Tăng huyết áp | **Tim mạch** | Không | Bệnh lý tim mạch mạn tính |
| 25 | `Hyperthyroidism` | Cường giáp (Bệnh Basedow) | **Nội tổng quát** | Không | Bệnh lý nội tiết |
| 26 | `Hypoglycemia` | Hạ đường huyết cấp | **Nội tổng quát** | Không | Cấp cứu nội tiết / Rối loạn đường huyết |
| 27 | `Hypothyroidism` | Suy giáp | **Nội tổng quát** | Không | Bệnh lý nội tiết |
| 28 | `Impetigo` | Bệnh chốc lở | **Da liễu** | Không | Nhiễm khuẩn da nông (rất phổ biến ở Nhi khoa) |
| 29 | `Jaundice` | Hội chứng vàng da | **Nội tổng quát** | Không | Triệu chứng / Bệnh cảnh gan mật |
| 30 | `Malaria` | Sốt rét | **Nội tổng quát** | Không | Bệnh ký sinh trùng truyền nhiễm |
| 31 | `Migraine` | Đau nửa đầu Migraine | **Nội tổng quát** | Không | Rối loạn thần kinh chức năng |
| 32 | `Osteoarthristis` | Thoái hóa khớp | **Cơ xương khớp** | Không | Bệnh lý khớp mạn tính thoái hóa |
| 33 | `Paralysis (brain hemorrhage)` | Liệt do xuất huyết não (Đột quỵ não) | **Tim mạch** | ⚠️ **RED FLAG** | CẤP CỨU NGUY KỊCH - Red flag khẩn cấp (cần cân nhắc OUT_OF_SCOPE chuyển cấp cứu) |
| 34 | `Peptic ulcer diseae` | Loét dạ dày tá tràng | **Nội tổng quát** | Không | Bệnh lý tiêu hóa |
| 35 | `Pneumonia` | Viêm phổi | **Nội tổng quát** | Không | Nhiễm trùng đường hô hấp dưới (gặp nhiều ở Nhi khoa) |
| 36 | `Psoriasis` | Bệnh vảy nến | **Da liễu** | Không | Bệnh lý viêm da tự miễn mạn tính |
| 37 | `Tuberculosis` | Lao phổi | **Nội tổng quát** | Không | Bệnh nhiễm khuẩn lao hô hấp |
| 38 | `Typhoid` | Sốt thương hàn | **Nội tổng quát** | Không | Nhiễm khuẩn tiêu hóa Salmonella |
| 39 | `Urinary tract infection` | Nhiễm trùng đường tiết niệu | **Nội tổng quát** | Không | Nhiễm trùng thận - tiết niệu |
| 40 | `Varicose veins` | Suy giãn tĩnh mạch chi dưới | **Tim mạch** | Không | Bệnh lý mạch máu ngoại vi |
| 41 | `hepatitis A` | Viêm gan siêu vi A | **Nội tổng quát** | Không | Bệnh lý gan mật |

### Thống kê phân bổ theo chuyên khoa đề xuất:
- **Nội tổng quát:** 26 bệnh
- **Da liễu:** 6 bệnh
- **Tim mạch:** 4 bệnh
- **Cơ xương khớp:** 3 bệnh
- **Tai Mũi Họng:** 2 bệnh

---

## 7. Đánh giá Tập Dữ liệu Thuốc Phụ trợ (`medications.csv`)

- `medications.csv` cung cấp danh sách thuốc gợi ý cho **đúng 41 bệnh lý** trong dataset.
- Định dạng trong file: chuỗi danh sách Python gồm 5 thuốc/hoạt chất cho mỗi bệnh.
- **Hạn chế y khoa:**
  - Thuốc được gán theo tên thương mại tiếng Anh hoặc nhóm thuốc chung (ví dụ: `['Antifungal Cream', 'Fluconazole', ...]`).
  - Không có thông tin liều lượng (phù hợp với quy tắc: CDSS không tự ý trả liều dùng).
  - Cần ánh xạ sang `medicines.csv` và `disease_medicine.csv` với cột `source='raw_dataset_medications.csv'`, `reviewed=false` để Dược sĩ/Bác sĩ duyệt trước khi đưa vào sản xuất.

---

## 8. CÁC QUYẾT ĐỊNH CẦN NGƯỜI DÙNG (USER) XÁC NHẬN

Theo quy định của Phase 0b, hệ thống tạm dừng và yêu cầu Người dùng xác nhận 4 quyết định thiết kế trước khi chuyển sang Phase 1:

### Quyết định 1: Xử lý các bệnh đặc biệt & Ngoài phạm vi (Keep vs. Out of Scope)
- `Heart attack` (Nhồi máu cơ tim) và `Paralysis (brain hemorrhage)` (Đột quỵ não): Đây là các tình huống cấp cứu đe dọa tính mạng.
  - **Đề xuất:** Giữ trong mô hình huấn luyện, gán vào Tim mạch/Nội khoa NHƯNG kích hoạt quy tắc **Red Flag** ưu tiên cảnh báo khẩn cấp trong phản hồi API.
- `Dimorphic hemmorhoids(piles)` (Bệnh trĩ): Về mặt chuyên khoa thuộc Ngoại khoa / Hậu môn trực tràng.
  - **Đề xuất:** Xếp tạm vào Nội tổng quát (khám và kê thuốc nội khoa giai đoạn đầu) hoặc đánh dấu `specialty='OUT_OF_SCOPE'` nếu bạn muốn loại bỏ?

### Quyết định 2: Xác nhận bảng Mapping 6 Chuyên khoa
- Xác nhận bảng phân bổ 41 bệnh vào 6 chuyên khoa ở Mục 6.
- Riêng chuyên khoa **Nhi khoa**: Một số bệnh như `Chicken pox`, `Impetigo`, `Common Cold`, `Pneumonia` thường gặp ở cả trẻ em và người lớn. Đề xuất: Phân loại theo chuyên khoa bệnh học chính, khi có `patient.age < 16`, hệ thống có thể linh hoạt bổ sung gợi ý chuyển tiếp chuyên khoa Nhi khoa.

### Quyết định 3: Chiến lược Xử lý Ngôn ngữ (Language Pipeline)
- Sử dụng tên tiếng Anh chuẩn hóa làm `symptom_id` nội bộ (vd: `fever`, `cough`, `skin_rash`).
- Khởi tạo `data/kb/symptom_map_vi.csv` dịch nháp toàn bộ 132 triệu chứng sang tiếng Việt có dấu, không dấu và các từ đồng nghĩa thông dụng của bệnh nhân Việt Nam, đánh dấu toàn bộ `reviewed=false`.

### Quyết định 4: Chiến lược Chia tập Dữ liệu & Huấn luyện (Splitting & Augmentation)
- **Deduplicate trước khi chia tập:** Chia trên 304 tổ hợp triệu chứng duy nhất theo tỉ lệ Stratified 70% Train (~212 ca), 15% Validation (~46 ca), 15% Test (~46 ca).
- **Data Augmentation CHỈ chạy trên tập Train:** Sinh thêm các ca bệnh biến thể thực tế (bỏ ngẫu nhiên 20–40% triệu chứng, thêm 0–2 triệu chứng nhiễu, biến thể gõ tiếng Việt) để mô hình học được tính bền vững lâm sàng.
- **Tạo tập `test_noisy` độc lập:** Đo lường độ bền trên dữ liệu test không bị rò rỉ.
