import { useRef } from "react";
import { toast } from "react-toastify";
import { HiOutlineCamera, HiOutlineTrash } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import Avatar from "../ui/Avatar";

const MAX_SIZE_MB = 2;

export default function AvatarField({ name, src, onChange }) {
  const inputRef = useRef(null);

  function handlePick() {
    inputRef.current?.click();
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
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
    reader.onload = () => onChange(reader.result);
    reader.onerror = () => toast.error("Không thể đọc tệp ảnh, vui lòng thử lại");
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="relative w-fit">
        <Avatar name={name} src={src} color="#4E635A" size="xl" />
        <Button
          size="icon"
          onClick={handlePick}
          aria-label="Đổi ảnh đại diện"
          className="absolute -bottom-1 -right-1 ring-4 ring-card"
        >
          <HiOutlineCamera />
        </Button>
        <input ref={inputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={handleFile} />
      </div>
      <div>
        <p className="text-title">{name}</p>
        <p className="mb-3 mt-0.5 text-sm text-muted-foreground">Ảnh JPG hoặc PNG, tối đa {MAX_SIZE_MB}MB</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePick}>Tải ảnh lên</Button>
          {src && (
            <Button variant="ghost-danger" size="sm" onClick={() => onChange(null)}>
              <HiOutlineTrash /> Xóa ảnh
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
