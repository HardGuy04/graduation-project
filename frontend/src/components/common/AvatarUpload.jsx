import { useRef } from "react";
import { toast } from "react-toastify";
import { HiOutlineCamera, HiOutlineTrash } from "react-icons/hi";
import Avatar from "../ui/Avatar";

const MAX_SIZE_MB = 2;

export default function AvatarUpload({ name, src, color, onChange }) {
  const inputRef = useRef(null);

  function handlePick() {
    inputRef.current?.click();
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng 1 file lần sau
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn một tệp hình ảnh (JPG, PNG…)");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Kích thước ảnh tối đa ${MAX_SIZE_MB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(reader.result); // base64 data URL
    reader.onerror = () => toast.error("Không thể đọc tệp ảnh, vui lòng thử lại");
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        <Avatar name={name} src={src} color={color} size="xl" />
        <button
          type="button"
          onClick={handlePick}
          title="Đổi ảnh đại diện"
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-teal-500 text-white ring-4 ring-white hover:bg-teal-600 transition"
        >
          <HiOutlineCamera className="h-4 w-4" />
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <div>
        <p className="font-semibold text-ink text-sm">Ảnh đại diện</p>
        <p className="text-xs text-ink-faint mt-0.5 mb-2">JPG hoặc PNG, tối đa {MAX_SIZE_MB}MB</p>
        <div className="flex gap-2">
          <button type="button" onClick={handlePick} className="text-xs font-semibold text-teal-600 hover:text-teal-700">
            Tải ảnh lên
          </button>
          {src && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1 text-xs font-semibold text-clay-500 hover:text-clay-600"
            >
              <HiOutlineTrash className="h-3.5 w-3.5" /> Xóa ảnh
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
