# MediCare Hub — Backend API

API cho hệ thống quản lý một phòng khám (web, sau mở rộng mobile).
Node.js 24 · Express 5 · MySQL 9 (mysql2/promise, SQL thuần) · JWT.

## Chạy

```bash
cd backend
npm install
cp .env.example .env      # rồi điền DB_PASSWORD, JWT_SECRET (≥ 32 ký tự)...
npm run db:check          # so schema.sql với DB thật (chỉ đọc)
npm run seed              # dữ liệu thử TEST-* / test-seed-*@example.com (chỉ INSERT)
npm run dev               # http://localhost:5000
```

Tài khoản DB nên là user riêng chỉ có `SELECT, INSERT, UPDATE, DELETE` trên `clinic.*`.
Ứng dụng không chạy DDL; thay đổi cấu trúc đi qua `database/migrations/` và do quản trị viên tự chạy.

Migration đề xuất (chạy bằng root, theo thứ tự số):

```bash
mysql -u root -p clinic < database/migrations/001_login_attempts.sql
mysql -u root -p clinic < database/migrations/002_notification_unique.sql
mysql -u root -p clinic < database/migrations/003_payment_intent.sql
```

Sau khi chạy xong, báo để cập nhật `schema.sql`. Chưa chạy thì API vẫn dùng bộ nhớ cho giới hạn đăng nhập sai và nạp ví mô phỏng.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `ACCESS_TOKEN_TTL` | `15m` | Thời hạn access token |
| `REFRESH_TOKEN_DAYS` | `30` | Thời hạn refresh token |
| `CORS_ORIGIN` | | Danh sách origin, phân tách bằng dấu phẩy |
| `CLINIC_UTC_OFFSET` | `+07:00` | Múi giờ phòng khám (giờ ca làm việc, nhóm báo cáo theo ngày) |
| `REMINDER_ENABLED` | `true` | Job nhắc lịch (10 phút/lần, nhắc trước 24 giờ) |

## Kiểm thử

Test tích hợp gọi API thật, nên server phải đang chạy và đã `npm run seed`.

```bash
npm test                         # toàn bộ tests/*.test.js
node --test tests/appointment.test.js
npm run test:cleanup -- --dry-run   # đếm dữ liệu test
npm run test:cleanup                # xóa user test-%@example.com, chuyên khoa/phòng TEST-% và dữ liệu phụ thuộc
```

Giới hạn đăng nhập sai nằm trong bộ nhớ (30 lần/IP/15 phút). Chạy test liên tục nhiều lần thì khởi động lại server.

## Quy ước

- Mọi đường dẫn nằm dưới `/api`. Header `Authorization: Bearer <accessToken>`.
- Thành công trả `{ data }`; danh sách trả `{ data: [...], pagination: { page, limit, total, totalPages } }` (`?page=1&limit=20`, tối đa 100). Xóa trả `204`.
- Lỗi trả `{ error: { code, message } }`. 400 dữ liệu sai · 401 chưa đăng nhập/token hỏng · 403 sai vai trò/tài khoản khóa · 404 không tồn tại **hoặc không thuộc quyền của bạn** · 409 xung đột · 429 quá số lần thử.
- Thời gian gửi lên/trả về là ISO 8601 UTC (`2026-10-20T02:00:00Z`; gửi lên phải có `Z` hoặc `±HH:MM`). Tham số ngày `date/from/to` (`YYYY-MM-DD`) và giờ ca `HH:MM` hiểu theo giờ phòng khám.
- Tiền là chuỗi thập phân `"150000.00"`; gửi lên được số hoặc chuỗi, tối đa 2 chữ số thập phân.
- Enum viết HOA, gửi chữ thường cũng được chấp nhận: lịch hẹn `PENDING → CONFIRMED → CHECKED_IN → DONE`, `CANCELLED`, `NO_SHOW`.

## Endpoint

### Công khai
| Method | Đường dẫn | Ghi chú |
|---|---|---|
| GET | `/api/health` | |
| POST | `/api/auth/register` | Chỉ tạo PATIENT (kèm ví 0đ) |
| POST | `/api/auth/login` | `{ login \| email \| username, password }` |
| POST | `/api/auth/refresh` | `{ refreshToken }`, xoay vòng token; dùng lại token cũ thì thu hồi cả phiên |
| POST | `/api/auth/logout` | `{ refreshToken }` |
| GET | `/api/specialties`, `/api/specialties/:id` | |
| GET | `/api/doctors`, `/api/doctors/:id` | `?specialtyId&q` |
| GET | `/api/doctors/:id/schedules` | Ca làm việc ACTIVE |
| GET | `/api/doctors/:id/slots?date=YYYY-MM-DD` | Khung giờ trống (đã bỏ giờ quá khứ, ngày nghỉ, khung đã có lịch, ca đã đủ người) |

### Mọi vai trò đã đăng nhập
| Method | Đường dẫn | Ghi chú |
|---|---|---|
| GET/PATCH | `/api/auth/me` | PATIENT sửa thêm `dateOfBirth, gender, address`; ADMIN sửa `position` |
| POST | `/api/auth/change-password` | Thu hồi mọi phiên cũ, trả phiên mới |
| GET | `/api/appointments` | Tự lọc theo vai trò. `?status=a,b&date&from&to&upcoming&doctorId&patientId&q&sort=asc` |
| GET | `/api/appointments/:id` | |

### PATIENT
| Method | Đường dẫn | Ghi chú |
|---|---|---|
| POST | `/api/appointments` | `{ doctorId, startAt, endAt?, reason? }` → PENDING. Không gửi `endAt` thì lấy theo thời lượng lượt khám của ca. `patientId` trong body bị bỏ qua |
| PATCH | `/api/appointments/:id/cancel` | Chỉ khi chưa tới giờ hẹn và chưa check-in |
| GET | `/api/patient/medical-records[/:id]` | Kèm đơn thuốc |
| GET | `/api/patient/invoices[/:id]` | |
| POST | `/api/patient/invoices/:id/pay-wallet` | |
| GET | `/api/patient/wallet`, `/api/patient/wallet/transactions` | |
| POST | `/api/patient/wallet/topup` | `{ amount }`, mô phỏng (chưa nối cổng thanh toán) |
| GET | `/api/patient/notifications`, `/unread-count` | `?unread=true` |
| PATCH | `/api/patient/notifications/:id/read`, `/read-all` | |

### DOCTOR
| Method | Đường dẫn | Ghi chú |
|---|---|---|
| GET/POST | `/api/doctor/schedules` | `{ dayOfWeek (1 = Thứ 2 … 7 = CN), startTime, endTime, slotDuration, maxPatient, status }` |
| PATCH/DELETE | `/api/doctor/schedules/:id` | |
| GET/POST | `/api/doctor/leaves` | `{ leaveDate, reason }`, từ hôm nay trở đi; trả `affectedAppointments` |
| DELETE | `/api/doctor/leaves/:id` | |
| PATCH | `/api/appointments/:id/no-show` | Lịch của mình, sau giờ hẹn |
| GET | `/api/doctor/patients[/:id]` | Chỉ bệnh nhân có lịch (chưa hủy) với mình |
| GET | `/api/doctor/patients/:id/history` | Toàn bộ bệnh án của bệnh nhân đó |
| GET | `/api/doctor/medical-records[/:id]` | |
| POST | `/api/doctor/medical-records` | `{ appointmentId, symptoms, diagnosis, note, followUpDate, prescription? }`. Lịch phải CHECKED_IN, sau đó chuyển DONE |
| PATCH | `/api/doctor/medical-records/:id` | Chỉ bệnh án do mình viết |
| PUT | `/api/doctor/medical-records/:id/prescription` | `{ note, items: [{ medicineName, dosage, quantity, usageInstruction }] }`, thay toàn bộ đơn |
| GET | `/api/doctor/incomes` | |

### ADMIN (kiêm lễ tân)
| Method | Đường dẫn | Ghi chú |
|---|---|---|
| GET/POST | `/api/admin/users` | Tạo DOCTOR / ADMIN / PATIENT |
| GET/PATCH | `/api/admin/users/:id` | |
| PATCH | `/api/admin/users/:id/status` | `ACTIVE / LOCKED / DISABLED`; khóa thì thu hồi phiên |
| POST | `/api/admin/users/:id/reset-password` | |
| GET | `/api/admin/doctors[/:id]`; PATCH `/api/admin/doctors/:id` | |
| GET/POST/PATCH/DELETE | `/api/admin/doctors/:doctorId/schedules[/:id]` | |
| GET/POST/DELETE | `/api/admin/doctors/:doctorId/leaves[/:id]`; GET `/api/admin/leaves` | Ghi nhận được cả ngày đã qua |
| GET | `/api/admin/patients[/:id]` | Kèm số dư ví và tóm tắt lịch sử |
| GET | `/api/admin/patients/:id/wallet[/transactions]`; POST `.../wallet/topup` | Nạp hộ |
| GET/POST/PATCH/DELETE | `/api/admin/specialties[/:id]` | |
| GET/POST/PATCH/DELETE | `/api/admin/rooms[/:id]`; GET `/api/admin/rooms/available?startAt&endAt` | |
| POST | `/api/appointments` | Đặt hộ: `{ patientId, doctorId, roomId?, startAt, endAt?, reason? }` → CONFIRMED |
| PATCH | `/api/appointments/:id/confirm` · `/check-in` · `/cancel` · `/no-show` · `/room` | `/room`: `{ roomId \| null }` |
| GET/POST | `/api/admin/invoices` | `{ appointmentId, items: [{ label, amount }] }`, chỉ cho lịch DONE |
| GET | `/api/admin/invoices/:id` | |
| PATCH | `/api/admin/invoices/:id/pay` | `{ method: CASH \| CARD \| TRANSFER }` |
| GET | `/api/admin/stats/overview` | |
| GET | `/api/admin/stats/visits` | `?groupBy=day\|month&from&to&doctorId` |
| GET | `/api/admin/stats/by-doctor` · `/by-specialty` · `/cancellation` | `?from&to` |
| GET | `/api/admin/stats/revenue` | `?groupBy&from&to`, theo ngày thanh toán |
| GET | `/api/admin/incomes?month=YYYY-MM` | Bác sĩ chưa chốt lương có `saved: false` kèm số ngày tính tạm |
| PUT | `/api/admin/incomes/:doctorId/:month` | `{ salary, dayOn?, dayOff? }`, `received = salary × dayOn / (dayOn + dayOff)` |

## Chống trùng lịch

Đặt lịch, đổi phòng, tạo ca làm việc và ngày nghỉ đều chạy trong transaction ngắn. Thứ tự khóa cố định là `doctor → room → patient` (`SELECT … FOR UPDATE`). Sau khi khóa mới kiểm tra chồng lấn `start_cũ < end_mới AND end_cũ > start_mới`, đối chiếu ca làm việc, ngày nghỉ và `max_patient`. Lớp chặn cuối cùng là unique index trên cột sinh `active_doctor_slot` / `active_room_slot`.
Mọi chuyển trạng thái (lịch hẹn, hóa đơn, refresh token, trừ ví) đều là `UPDATE` có điều kiện, rồi kiểm tra `affectedRows`.
