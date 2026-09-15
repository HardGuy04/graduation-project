import { Link } from "react-router-dom";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <HiOutlineExclamationCircle className="h-14 w-14 text-teal-300" />
      <h1 className="text-3xl font-extrabold font-display text-ink">Không tìm thấy trang</h1>
      <p className="max-w-sm text-ink-faint">Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.</p>
      <Link to="/"><Button>Về trang chủ</Button></Link>
    </div>
  );
}
