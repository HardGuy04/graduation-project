import { Outlet } from "react-router-dom";
import { HiOutlineShieldCheck, HiOutlineClock, HiOutlineUserGroup } from "react-icons/hi";

const POINTS = [
  { icon: HiOutlineClock, text: "Đặt lịch khám trực tuyến, chủ động chọn khung giờ trống của bác sĩ" },
  { icon: HiOutlineUserGroup, text: "Ba vai trò Admin – Bác sĩ – Bệnh nhân, mỗi người một không gian làm việc riêng" },
  { icon: HiOutlineShieldCheck, text: "Hồ sơ bệnh án điện tử được lưu trữ an toàn, tra cứu nhanh chóng" },
];

export default function AuthLayout() {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-paper">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-teal-800 px-12 py-12 text-teal-50">
        <svg className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] text-teal-700/50" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="100" fill="currentColor" />
        </svg>
        <svg className="pointer-events-none absolute -bottom-32 -left-16 h-[360px] w-[360px] text-teal-700/40" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="100" fill="currentColor" />
        </svg>

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl2 bg-teal-50 text-teal-700 font-display font-extrabold text-xl">M</div>
          <p className="font-display text-lg font-bold">MediCare Hub</p>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-white">
            Vận hành phòng khám gọn gàng, khoa học hơn mỗi ngày.
          </h2>
          <p className="mt-4 text-teal-100 leading-relaxed">
            Một nền tảng duy nhất cho lễ tân, bác sĩ và bệnh nhân — từ đặt lịch, khám bệnh
            đến thống kê doanh thu.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-700/70">
                  <p.icon className="h-4 w-4 text-teal-100" />
                </span>
                <span className="text-sm text-teal-50/90 leading-relaxed">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-teal-200/70">
          © 2026 MediCare Hub — Đồ án tốt nghiệp, Học viện Công nghệ Bưu chính Viễn thông.
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
