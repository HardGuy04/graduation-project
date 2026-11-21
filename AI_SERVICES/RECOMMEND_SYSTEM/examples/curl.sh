#!/usr/bin/env bash
# Shell script containing curl commands for testing the AI_SERVICE contract.
# Usage: bash examples/curl.sh

BASE_URL="http://localhost:8000"
INTERNAL_KEY="${AI_INTERNAL_KEY:-dev-secret-key-change-in-production}"

echo "======================================================================"
echo "1. Trường hợp 1: Thành công chuẩn (Sốt, ho, đau họng)"
echo "======================================================================"
curl -s -X POST "${BASE_URL}/internal/predict-disease" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: ${INTERNAL_KEY}" \
  -d '{
    "symptoms": "Đau họng, sốt nhẹ, ho khan",
    "diagnosis": "",
    "patient": {
      "age": 28,
      "gender": "male",
      "allergies": ["penicillin"]
    },
    "topK": 3
  }' | jq . || cat

echo -e "\n\n======================================================================"
echo "2. Trường hợp 2: Sai / Thiếu API key (Kỳ vọng HTTP 401 Unauthorized)"
echo "======================================================================"
curl -s -i -X POST "${BASE_URL}/internal/predict-disease" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: invalid-secret-token" \
  -d '{"symptoms": "Đau họng, sốt nhẹ, ho khan"}'

echo -e "\n\n======================================================================"
echo "3. Trường hợp 3: Body rỗng / Sai kiểu dữ liệu (Kỳ vọng HTTP 422)"
echo "======================================================================"
curl -s -i -X POST "${BASE_URL}/internal/predict-disease" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: ${INTERNAL_KEY}" \
  -d '{"symptoms": ""}'

echo -e "\n\n======================================================================"
echo "4. Trường hợp 4: Triệu chứng không đủ để gợi ý (< 2 triệu chứng)"
echo "   (Kỳ vọng HTTP 200, diseases rỗng, kèm warning)"
echo "======================================================================"
curl -s -X POST "${BASE_URL}/internal/predict-disease" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: ${INTERNAL_KEY}" \
  -d '{"symptoms": "sốt nhẹ"}' | jq . || cat

echo -e "\n\n======================================================================"
echo "5. Trường hợp 5: Ca có dấu hiệu nguy cấp Red Flag"
echo "   (Kỳ vọng HTTP 200, redFlags không rỗng)"
echo "======================================================================"
curl -s -X POST "${BASE_URL}/internal/predict-disease" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Key: ${INTERNAL_KEY}" \
  -d '{
    "symptoms": "Bệnh nhân đau thắt ngực dữ dội, toát mồ hôi, khó thở đột ngột",
    "topK": 3
  }' | jq . || cat

echo -e "\n\n======================================================================"
echo "6. Health Check"
echo "======================================================================"
curl -s "${BASE_URL}/health" | jq . || cat
echo ""
