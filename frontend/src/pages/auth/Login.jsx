import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";
import Button from "../../components/ui/Button";
import { FormRow, Input } from "../../components/ui/Field";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: "", password: "" } });

  async function onSubmit(values) {
    try {
      const user = await login(values.email, values.password);
      toast.success(`Chào mừng trở lại, ${user.fullName}!`);
      const from = location.state?.from?.pathname;
      navigate(from && from !== "/login" ? from : `/${user.role}`, { replace: true });
    } catch (err) {
      toast.error(err.message || "Đăng nhập thất bại");
    }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-3xl font-extrabold text-ink">Đăng nhập</h1>
      <p className="mt-2 text-sm text-ink-faint">
        Truy cập không gian làm việc của bạn tại MediCare Hub.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <FormRow label="Email" required error={errors.email?.message}>
          <div className="relative">
            <HiOutlineMail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <Input
              type="email"
              placeholder="ban@email.com"
              className="pl-10"
              {...register("email", { required: "Vui lòng nhập email" })}
            />
          </div>
        </FormRow>

        <FormRow label="Mật khẩu" required error={errors.password?.message}>
          <div className="relative">
            <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10 pr-10"
              {...register("password", { required: "Vui lòng nhập mật khẩu" })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink-soft"
            >
              {showPassword ? <HiOutlineEyeOff className="h-4 w-4" /> : <HiOutlineEye className="h-4 w-4" />}
            </button>
          </div>
        </FormRow>

        <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
          Đăng nhập
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-faint">
        Chưa có tài khoản?{" "}
        <Link to="/register" className="font-semibold text-teal-600 hover:text-teal-700">
          Đăng ký bệnh nhân mới
        </Link>
      </p>
    </div>
  );
}
