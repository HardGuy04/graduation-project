import { Link } from "react-router-dom";
import { FaFacebook } from "react-icons/fa";
import { HiOutlinePhone, HiOutlineMail, HiOutlineLocationMarker, HiOutlineClock } from "react-icons/hi";
import { CLINIC_INFO, FOOTER_LINKS } from "@/utils/clinicInfo";

/**
 * Footer dùng chung cho giao diện Bác sĩ và Bệnh nhân.
 * variant: "patient" | "doctor" — đổi nhóm liên kết nhanh theo vai trò.
 */
export default function Footer({ variant = "patient" }) {
  const links = FOOTER_LINKS[variant] || FOOTER_LINKS.patient;
  const year = new Date().getFullYear();

  return (
    // pb-20 chừa chỗ cho nút chatbot float ở góc phải, không che chữ cuối
    <footer className="mt-auto border-t border-border bg-card pb-20">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-10 sm:px-6 sm:py-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-10 lg:px-8">
        {/* Giới thiệu */}
        <div>
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[15px] font-extrabold text-primary-foreground">M</span>
            <span className="text-[15px] font-bold tracking-[-0.01em]">{CLINIC_INFO.name}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{CLINIC_INFO.tagline}</p>
          <a
            href={CLINIC_INFO.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent/50 hover:bg-tile"
          >
            <FaFacebook aria-hidden className="h-4 w-4 text-[#1877F2]" />
            Facebook
          </a>
        </div>

        {/* Liên hệ */}
        <div>
          <h2 className="text-title text-foreground">Liên hệ</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <HiOutlinePhone aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Hotline:{" "}
                <a href={`tel:${CLINIC_INFO.hotline}`} className="font-semibold text-foreground hover:underline">{CLINIC_INFO.hotline}</a>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <HiOutlineMail aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Email:{" "}
                <a href={`mailto:${CLINIC_INFO.email}`} className="font-semibold text-foreground hover:underline">{CLINIC_INFO.email}</a>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <HiOutlineLocationMarker aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Địa chỉ: {CLINIC_INFO.address}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <HiOutlineClock aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Giờ làm việc: {CLINIC_INFO.workingHours}</span>
            </li>
          </ul>
        </div>

        {/* Liên kết nhanh */}
        <nav aria-label="Liên kết nhanh">
          <h2 className="text-title text-foreground">Liên kết nhanh</h2>
          <ul className="mt-3 space-y-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  to={l.href}
                  className="inline-flex min-h-11 items-center rounded-field px-1 text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bản quyền */}
        <div>
          <h2 className="text-title text-foreground">Bản quyền</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            © {year} {CLINIC_INFO.name}. Đồ án tốt nghiệp, Học viện Công nghệ Bưu chính Viễn thông.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {/* Trang chính sách chưa có trong dự án — để dạng chữ, không bấm được */}
            <li><span className="inline-flex min-h-11 items-center px-1 text-muted-foreground">Chính sách bảo mật</span></li>
            <li><span className="inline-flex min-h-11 items-center px-1 text-muted-foreground">Điều khoản sử dụng</span></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
