# Hướng dẫn test — Phase 1: POST /api/appointments

## Khởi động

```powershell
cd graduation-project/backend
npm run dev
# → MediCare Hub API — http://localhost:5000
```

## Health check

```powershell
Invoke-RestMethod -Uri 'http://localhost:5000/health'
# Kết quả: status = "ok"
```

## 5 ca test đặt lịch

Mở một terminal PowerShell mới, paste lần lượt:

```powershell
# ── Biến dùng chung ──────────────────────────────────────────────────
$base   = 'http://localhost:5000'
$future = (Get-Date).ToUniversalTime().AddDays(14).ToString('yyyy-MM-dd')
$past   = (Get-Date).ToUniversalTime().AddDays(-1).ToString('yyyy-MM-dd')
```

### Ca 1: Slot trống → 201

```powershell
$body = (@{
  patientId = 1
  doctorId  = 1
  startAt   = "${future}T09:00:00Z"
  endAt     = "${future}T09:30:00Z"
  reason    = "Kham tong quat"
} | ConvertTo-Json)

Invoke-RestMethod -Method Post -Uri "$base/api/appointments" `
  -Body $body -ContentType 'application/json'

# Kết quả mong đợi: HTTP 201
# { id: <N>, patientId: 1, doctorId: 1, status: "PENDING", ... }
```

### Ca 2: Trùng đúng giờ → 409

```powershell
# Gửi lại CÙNG body ở Ca 1
try {
  Invoke-RestMethod -Method Post -Uri "$base/api/appointments" `
    -Body $body -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }

# Kết quả mong đợi: HTTP 409
# {"error":{"code":"SLOT_TAKEN","message":"Bác sĩ đã có lịch trong khung giờ này"}}
```

### Ca 3: Chồng lấn lệch giờ → 409

```powershell
$body3 = (@{
  patientId = 2
  doctorId  = 1
  startAt   = "${future}T09:15:00Z"
  endAt     = "${future}T09:45:00Z"
} | ConvertTo-Json)

try {
  Invoke-RestMethod -Method Post -Uri "$base/api/appointments" `
    -Body $body3 -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }

# Kết quả mong đợi: HTTP 409 SLOT_TAKEN
# (09:15-09:45 chồng lên 09:00-09:30 đã có ở Ca 1)
```

### Ca 4: Doctor không tồn tại → 404

```powershell
$body4 = (@{
  patientId = 1
  doctorId  = 9999
  startAt   = "${future}T10:00:00Z"
  endAt     = "${future}T10:30:00Z"
} | ConvertTo-Json)

try {
  Invoke-RestMethod -Method Post -Uri "$base/api/appointments" `
    -Body $body4 -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }

# Kết quả mong đợi: HTTP 404
# {"error":{"code":"DOCTOR_NOT_FOUND","message":"Bác sĩ không tồn tại"}}
```

### Ca 5: startAt trong quá khứ → 400

```powershell
$body5 = (@{
  patientId = 1
  doctorId  = 1
  startAt   = "${past}T09:00:00Z"
  endAt     = "${past}T09:30:00Z"
} | ConvertTo-Json)

try {
  Invoke-RestMethod -Method Post -Uri "$base/api/appointments" `
    -Body $body5 -ContentType 'application/json'
} catch { $_.ErrorDetails.Message }

# Kết quả mong đợi: HTTP 400
# {"error":{"code":"INVALID_INPUT","message":"Không thể đặt lịch trong quá khứ"}}
```

## Lưu ý

- Ca 1 sẽ tạo dữ liệu mới trong DB. Nếu chạy lại Ca 1 thì nó trở thành Ca 2 (trùng giờ).
  Muốn chạy lại từ đầu, đổi ngày (`AddDays(14)` → `AddDays(15)`) hoặc xóa appointment vừa tạo.
- patientId=1 và doctorId=1 cần tồn tại sẵn trong DB (từ seed data).
- Server chạy múi giờ UTC. `startAt`/`endAt` nhận chuỗi ISO 8601 (`Z` = UTC).
