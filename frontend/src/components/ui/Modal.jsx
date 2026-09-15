import { useEffect } from "react";
import { createPortal } from "react-dom";
import { HiX } from "react-icons/hi";

export default function Modal({ open, onClose, title, subtitle, children, width = "max-w-lg" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div className={`relative w-full ${width} max-h-[88vh] overflow-y-auto scrollbar-thin rounded-xl2 bg-white shadow-pop animate-slide-up`}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-4 rounded-t-xl2">
          <div>
            <h3 className="text-lg font-bold text-ink font-display">{title}</h3>
            {subtitle && <p className="text-sm text-ink-faint mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-ink-faint hover:bg-slate-100 hover:text-ink transition"
            aria-label="Đóng"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
