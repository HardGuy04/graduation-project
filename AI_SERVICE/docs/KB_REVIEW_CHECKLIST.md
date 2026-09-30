# DANH MỤC KIỂM TRA ĐỐI SOÁT Y KHOA (KB REVIEW CHECKLIST)

> **Mục tiêu:** Cung cấp danh mục chi tiết để Bác sĩ Chuyên khoa và Dược sĩ Lâm sàng đối soát, chỉnh sửa và phê duyệt các tệp dữ liệu tri thức y khoa trong `data/kb/` trước khi đưa vào môi trường Production.
> **Tài liệu tham chiếu chuẩn:**
> 1. *Hướng dẫn Chẩn đoán và Điều trị các bệnh lý nội khoa - Bộ Y tế Việt Nam*.
> 2. *Dược thư Quốc gia Việt Nam (ấn bản mới nhất)*.
> 3. *Phác đồ điều trị của các Bệnh viện tuyến Trung ương (Bạch Mai, Chợ Rẫy)*.

---

## 1. Trạng Thái Hiện Tại của Dữ Liệu
- Toàn bộ các bản ghi trong Knowledge Base (`diseases.csv`, `symptoms.csv`, `symptom_map_vi.csv`, `medicines.csv`, `disease_medicine.csv`) hiện được gắn cờ:
  - `reviewed = false`
  - `source = "TODO"` hoặc `"dataset/medications.csv"`
- Khi khởi động service, hệ thống sẽ ghi log cảnh báo: `WARNING: Knowledge Base contains unreviewed clinical data.`
- Biến môi trường bảo vệ: `KB_REQUIRE_REVIEWED=true` sẽ từ chối chạy nếu còn bản ghi chưa được duyệt.

---

## 2. Danh Mục Cần Bác Sĩ Chuyên Khoa Duyệt

### 2.1. Phê duyệt Danh mục Bệnh và Phân khoa (`data/kb/diseases.csv`)
- [ ] **Tính chính xác của tên bệnh tiếng Việt:** Đối chiếu thuật ngữ ICD-10 tiêu chuẩn (Ví dụ: `vertigo_paroxysmal_positional_vertigo` $\rightarrow$ "Chóng mặt kịch phát tư thế lành tính (BPPV)").
- [ ] **Phân bổ 6 chuyên khoa:** Xác nhận sự phù hợp khi đưa bệnh nhân đến phòng khám:
  - Nội tổng quát (26 bệnh)
  - Da liễu (6 bệnh)
  - Tim mạch (4 bệnh)
  - Cơ xương khớp (3 bệnh)
  - Tai Mũi Họng (2 bệnh)
  - Nhi khoa (áp dụng linh hoạt khi `patient.age < 16`)
- [ ] **Xác nhận cờ Cấp cứu Khẩn cấp (Red Flag):**
  - Đã đánh dấu: `heart_attack` (Nhồi máu cơ tim), `paralysis_brain_hemorrhage` (Đột quỵ / Xuất huyết não).
  - Cần bác sĩ xem xét có cần bổ sung Red flag cho: `dengue` có dấu hiệu cảnh báo, `tuberculosis` ho ra máu sét đánh, hoặc `acute_liver_failure`?

### 2.2. Phê duyệt Từ vựng Triệu chứng (`data/kb/symptoms.csv` & `symptom_map_vi.csv`)
- [ ] **Bản dịch tiếng Việt chuẩn y khoa:** Kiểm tra 132 triệu chứng xem cách dịch có phản ánh đúng thực tế hỏi bệnh tại phòng khám Việt Nam hay không.
- [ ] **Bí danh (Aliases) & Từ ngữ đời thường:**
  - Bổ sung các cách mô tả dân gian của người bệnh (ví dụ: "vọp bẻ" cho chuột rút, "nóng ruột/xót ruột" cho đau dạ dày, "mệt đứt hơi" cho khó thở).
- [ ] **Trọng số mức độ nghiêm trọng (Severity weight 1-7):** Kiểm tra thang điểm phản ánh nguy cơ cảnh báo.

---

## 3. Danh Mục Cần Dược Sĩ Lâm Sàng Duyệt

### 3.1. Phê duyệt Danh mục Thuốc (`data/kb/medicines.csv`)
- [ ] **Tên hoạt chất và nhóm dược lý:** Chuyển đổi các tên thương mại hoặc tên nhóm chung trong dataset sang tên hoạt chất chuẩn Dược thư (ví dụ: `Antifungal Cream` $\rightarrow$ Clotrimazole 1%, Ketoconazole 2%; `Antihistamines` $\rightarrow$ Loratadine, Cetirizine).
- [ ] **Phân loại Kê đơn (Rx) vs. Không kê đơn (OTC):** Xác nhận cờ `prescription_required` đúng theo Thông tư quy định danh mục thuốc không kê đơn của Bộ Y tế.
- [ ] **Mô tả công dụng (`usage`):** Tuyệt đối KHÔNG ghi liều dùng hay cách dùng cụ thể (số viên, số lần/ngày); chỉ nêu công dụng chính và nhóm tác dụng.
- [ ] **Chống chỉ định & Dị ứng (`contraindications`):**
  - Rà soát các cảnh báo dị ứng chéo (ví dụ: dị ứng Penicillin $\rightarrow$ cẩn trọng Cephalosporin; NSAID $\rightarrow$ chống chỉ định loét dạ dày tiến triển, suy thận nặng).

### 3.2. Phê duyệt Ma trận Gợi ý Thuốc - Bệnh (`data/kb/disease_medicine.csv`)
- [ ] **Mức độ ưu tiên phác đồ (`line`):**
  - Thuốc hàng 1 (`line=1`, weight = 0.9 - 1.0): Lựa chọn đầu tay theo hướng dẫn chẩn đoán điều trị.
  - Thuốc hàng 2 / hỗ trợ (`line=2`, weight = 0.6 - 0.8): Lựa chọn thay thế hoặc phối hợp triệu chứng.
- [ ] **Loại bỏ các thuốc lỗi thời hoặc không phù hợp ngoại trú:** Bỏ bớt các thủ thuật hoặc phẫu thuật lớn khỏi danh mục thuốc kê đơn phòng khám nếu cần.

---

## 4. Quy Trình Chuyển Đổi Sang Trạng Thái Đã Duyệt (`reviewed=true`)
1. Bác sĩ/Dược sĩ ghi chú trực tiếp vào file CSV hoặc xuất file Excel đối soát.
2. Cập nhật cột `reviewed` thành `true`, điền cột `source` bằng văn bản hướng dẫn cụ thể (ví dụ: `source = "Quyết định 3985/QĐ-BYT"`).
3. Chạy lệnh kiểm tra tính toàn vẹn:
   ```bash
   python scripts/validate_kb.py
   ```
4. Khi toàn bộ 100% dòng đạt `reviewed=true`, có thể kích hoạt biến môi trường an toàn tuyệt đối:
   ```env
   KB_REQUIRE_REVIEWED=true
   ```
