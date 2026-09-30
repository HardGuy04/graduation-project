# Raw Dataset Metadata

Tài liệu này ghi lại thông tin xác thực nguồn gốc và tính toàn vẹn của các tệp dữ liệu raw trong `AI_SERVICE/dataset`.

## Nguyên tắc xử lý
- Toàn bộ tệp trong thư mục `dataset/` là **READ-ONLY**, tuyệt đối không chỉnh sửa trực tiếp hay ghi đè.
- Mọi biến đổi dữ liệu được thực hiện thông qua script tái lập tại `scripts/build_dataset.py` và xuất sang `data/processed/`.

## Danh mục tệp và SHA-256 Checksums

| Tên tệp | Kích thước (bytes) | SHA-256 Checksum | Định dạng & Mô tả |
| :--- | :--- | :--- | :--- |
| `Training.csv` | 1,370,414 | `cc00c869b702c0c90eef3c1fb4d0b54f16965f8def2dec7e1bf91d0b76480ac3` | Binary matrix (0/1 indicators) cho từng triệu chứng + cột nhãn `prognosis` |
| `symtoms_df.csv` | 347,918 | `7eaea94647059877026e5160a3cfef326f92f92634bdd397d6dd6a809bc777fa` | Triệu chứng theo cột `Symptom_1` ... `Symptom_4` kèm `Disease` |
| `medications.csv` | 4,643 | `ed20a9860e8b28dfe68a93e73315f8fac30f8275a204039f1c56d5eb43e8ce75` | Danh sách thuốc theo bệnh (`Disease`, `Medication`) |
| `description.csv` | 4,017 | `92479f16248a50e8d8728ebc020ce2a7c3254bea4cf9b1959344e88f2eacde7b` | Mô tả lâm sàng tóm tắt của bệnh |
| `precautions_df.csv` | 3,644 | `1c861595a43c106e5b5da035a0b480fd9c56008230a684f824db8ae1a16614db` | Các biện pháp phòng ngừa và hướng dẫn ban đầu (`Precaution_1..4`) |
| `Symptom-severity.csv` | 2,332 | `cb5a84b5ebde81bb18738b7e7733bcbc5abdc667b4376893fb1774d8c444bc8d` | Trọng số mức độ nghiêm trọng của triệu chứng |
| `diets.csv` | 4,671 | `60dcd99af04627bcc9bddd1cf95298cc2df3af3c664ad89ce6be534821cb3cad` | Khuyến nghị chế độ ăn |
| `workout_df.csv` | 20,266 | `6de044b92e572a74e0b4974981a7c144d3e4b87dd6b945f562925cb07289a1bd` | Khuyến nghị vận động / tập luyện |

## Nguồn gốc & Giấy phép (Provenance & License)
- **Nguồn:** Dataset tổng hợp chuẩn thường gặp trong các nghiên cứu và benchmark về Disease Symptom Prediction (Kaggle Disease Symptom Prediction benchmark dataset).
- **Ngôn ngữ ban đầu:** Tiếng Anh.
- **Tình trạng phân phối:** Tập dữ liệu nhỏ (~1.8 MB), được quản lý phiên bản nội bộ và đối soát bằng SHA-256.
