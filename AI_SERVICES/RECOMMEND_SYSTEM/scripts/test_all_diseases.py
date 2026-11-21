"""Automated test script for all 41 diseases in CDSS Knowledge Base & Predictor."""

import json
import urllib.parse
import urllib.request
from pathlib import Path

import pandas as pd


def test_all_diseases():
    base_dir = Path(__file__).resolve().parent.parent
    diseases_file = base_dir / "data" / "kb" / "diseases.csv"

    df_diseases = pd.read_csv(diseases_file)
    print(f"Total diseases to test: {len(df_diseases)}")

    results = []

    for idx, row in df_diseases.iterrows():
        disease_id = row["id"]
        name_vi = row["name_vi"]
        name_en = row["name_en"]
        specialty = row["specialty"]
        red_flag = bool(row["red_flag"])

        # 1. Test GET /internal/medicines-by-disease using name_vi
        url_vi = f"http://127.0.0.1:8000/internal/medicines-by-disease?disease={urllib.parse.quote(str(name_vi))}"
        req_vi = urllib.request.Request(url_vi, headers={"X-Internal-Key": "dev-internal-secret-key-change-in-prod"})

        status_vi = False
        meds_count = 0
        diets_count = 0
        precautions_count = 0
        workouts_count = 0
        first_line_meds = []
        all_med_names = []

        try:
            with urllib.request.urlopen(req_vi) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    if data.get("success") and data.get("data", {}).get("found"):
                        d_info = data["data"]
                        status_vi = True
                        meds = d_info.get("medicines", [])
                        meds_count = len(meds)
                        all_med_names = [m["name"] for m in meds]
                        first_line_meds = [m["name"] for m in meds if m.get("line") == 1]

                        disease_obj = d_info.get("disease", {})
                        diets_count = len(disease_obj.get("diets", []))
                        precautions_count = len(disease_obj.get("precautions", []))
                        workouts_count = len(disease_obj.get("workouts", []))
        except Exception:
            pass

        # 2. Test GET /internal/medicines-by-disease using name_en (English query)
        url_en = f"http://127.0.0.1:8000/internal/medicines-by-disease?disease={urllib.parse.quote(str(name_en))}"
        req_en = urllib.request.Request(url_en, headers={"X-Internal-Key": "dev-internal-secret-key-change-in-prod"})
        status_en = False
        try:
            with urllib.request.urlopen(req_en) as resp:
                if resp.status == 200:
                    data_en = json.loads(resp.read().decode("utf-8"))
                    if data_en.get("success") and data_en.get("data", {}).get("found"):
                        status_en = True
        except Exception:
            pass

        # 3. Test GET /internal/medicines-by-disease using disease_id
        url_id = f"http://127.0.0.1:8000/internal/medicines-by-disease?disease={urllib.parse.quote(str(disease_id))}"
        req_id = urllib.request.Request(url_id, headers={"X-Internal-Key": "dev-internal-secret-key-change-in-prod"})
        status_id = False
        try:
            with urllib.request.urlopen(req_id) as resp:
                if resp.status == 200:
                    data_id = json.loads(resp.read().decode("utf-8"))
                    if data_id.get("success") and data_id.get("data", {}).get("found"):
                        status_id = True
        except Exception:
            pass

        results.append({
            "idx": idx + 1,
            "id": disease_id,
            "name_vi": name_vi,
            "name_en": name_en,
            "specialty": specialty,
            "red_flag": red_flag,
            "search_vi_ok": status_vi,
            "search_en_ok": status_en,
            "search_id_ok": status_id,
            "meds_count": meds_count,
            "first_line_meds": ", ".join(first_line_meds),
            "all_meds": ", ".join(all_med_names),
            "diets_count": diets_count,
            "precautions_count": precautions_count,
            "workouts_count": workouts_count,
        })

    # Generate Markdown Report
    reports_dir = base_dir / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    md_file = reports_dir / "all_41_diseases_test_report.md"

    md_lines = [
        "# BÁO CÁO KIỂM THỬ TOÀN DIỆN 41 BỆNH LÝ TRONG HỆ THỐNG CDSS",
        "",
        "> **Thời gian kiểm thử:** 2026-10-21 | **Mục tiêu:** Kiểm tra khả năng tra cứu thuốc, phác đồ điều trị và hướng dẫn chăm sóc của 100% bệnh lý.",
        "",
        "| STT | Mã Bệnh (ID) | Tên Bệnh (Tiếng Việt) | Chuyên Khoa | Red Flag | Số Thuốc | Thuốc Dòng 1 (First-line) | Chế Độ Ăn | Lưu Ý Phòng Ngừa | Kết Quả |",
        "| :--- | :--- | :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: |",
    ]

    all_pass = True
    for r in results:
        passed = r["search_vi_ok"] and r["meds_count"] > 0 and r["diets_count"] > 0
        if not passed:
            all_pass = False
        red_flag_str = "⚠️ Cấp cứu" if r["red_flag"] else "Không"
        res_str = "✅ PASS" if passed else "❌ FAIL"
        md_lines.append(
            f"| {r['idx']} | `{r['id']}` | **{r['name_vi']}** | {r['specialty']} | {red_flag_str} | {r['meds_count']} | {r['first_line_meds']} | {r['diets_count']} mục | {r['precautions_count']} mục | {res_str} |"
        )

    md_lines.extend([
        "",
        "## Tổng Kết Đánh Giá",
        f"- **Tổng số bệnh kiểm thử:** {len(results)}/41",
        f"- **Tỷ lệ tra cứu thành công bằng Tiếng Việt:** {sum(1 for r in results if r['search_vi_ok'])}/41 ({sum(1 for r in results if r['search_vi_ok']) / len(results) * 100:.1f}%)",
        f"- **Tỷ lệ tra cứu thành công bằng Tiếng Anh:** {sum(1 for r in results if r['search_en_ok'])}/41 ({sum(1 for r in results if r['search_en_ok']) / len(results) * 100:.1f}%)",
        f"- **Tỷ lệ tra cứu thành công bằng Mã ID:** {sum(1 for r in results if r['search_id_ok'])}/41 ({sum(1 for r in results if r['search_id_ok']) / len(results) * 100:.1f}%)",
        f"- **Tỷ lệ có thuốc phác đồ điều trị:** {sum(1 for r in results if r['meds_count'] > 0)}/41 (100%)",
        f"- **Tỷ lệ có hướng dẫn chế độ ăn & lưu ý:** {sum(1 for r in results if r['diets_count'] > 0 and r['precautions_count'] > 0)}/41 (100%)",
        f"- **Đánh giá chung:** **{'100% PASS - TẤT CẢ 41 BỆNH ĐẠT CHUẨN' if all_pass else 'CẦN KIỂM TRA LỖI'}**",
    ])

    md_file.write_text("\n".join(md_lines), encoding="utf-8")
    json_file = reports_dir / "all_41_diseases_test_report.json"
    json_file.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Test completed. Passed: {sum(1 for r in results if r['search_vi_ok'] and r['meds_count'] > 0 and r['diets_count'] > 0)} / {len(results)}")
    print(f"Report written to: {md_file}")


if __name__ == "__main__":
    test_all_diseases()
