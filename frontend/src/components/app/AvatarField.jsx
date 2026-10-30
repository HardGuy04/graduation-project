import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { HiOutlineCamera, HiOutlineTrash } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import Avatar from "../ui/Avatar";

const MAX_SIZE_MB = 2;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

/** onChange(file | null) trả Promise: file = ảnh mới cần tải lên, null = xóa ảnh. */
export default function AvatarField({ name, src, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  function handlePick() {
    inputRef.current?.click();
  }

  async function run(value) {
    setBusy(true);
    try {
      await onChange(value);
    } catch (err) {
      toast.error(err.message || "Không cập nhật được ảnh đại diện");
    } finally {
      setBusy(false);
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error("Vui lòng chọn ảnh JPG, PNG, WEBP hoặc GIF");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Kích thước ảnh tối đa ${MAX_SIZE_MB}MB`);
      return;
    }
    run(file);
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="relative w-fit">
        <Avatar name={name} src={src} color="#4E635A" size="xl" />
        <Button
          size="icon"
          onClick={handlePick}
          loading={busy}
          aria-label="Đổi ảnh đại diện"
          className="absolute -bottom-1 -right-1 ring-4 ring-card"
        >
          <HiOutlineCamera />
        </Button>
        <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={handleFile} />
      </div>
      <div>
        <p className="text-title">{name}</p>
        <p className="mb-3 mt-0.5 text-sm text-muted-foreground">Ảnh JPG, PNG, WEBP hoặc GIF, tối đa {MAX_SIZE_MB}MB</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePick} disabled={busy}>
            {busy ? "Đang tải lên…" : "Tải ảnh lên"}
          </Button>
          {src && (
            <Button variant="ghost-danger" size="sm" onClick={() => run(null)} disabled={busy}>
              <HiOutlineTrash /> Xóa ảnh
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
