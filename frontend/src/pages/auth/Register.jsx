import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import Button from "../../components/ui/Button";
import { FormRow, Input, Select } from "../../components/ui/Field";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const {
    register, handleSubmit, watch, formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { gender: "male" } });

  async function onSubmit(values) {
    try {
      const user = await registerUser(values);
      toast.success("Đăng ký thành công! Chào mừng bạn đến với MediCare Hub.");
      navigate(`/${user.role}`, { replace: true });
    } catch (err) {
      toast.error(err.message || "Đăng ký thất bại");
    }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-3xl font-extrabold text-ink">Tạo tài khoản</h1>
      <p className="mt-2 text-sm text-ink-faint">Đăng ký để bắt đầu đặt lịch khám trực tuyến.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <FormRow label="Họ và tên" required error={errors.fullName?.message}>
          <Input placeholder="Nguyễn Văn A" {...register("fullName", { required: "Vui lòng nhập họ tên" })} />
        </FormRow>

        <FormRow label="Email" required error={errors.email?.message}>
          <Input type="email" placeholder="ban@email.com" {...register("email", { required: "Vui lòng nhập email" })} />
        </FormRow>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Số điện thoại" required error={errors.phone?.message}>
            <Input placeholder="09xxxxxxxx" {...register("phone", { required: "Bắt buộc" })} />
          </FormRow>
          <FormRow label="Ngày sinh" error={errors.dateOfBirth?.message}>
            <Input type="date" {...register("dateOfBirth")} />
          </FormRow>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Giới tính">
            <Select {...register("gender")}>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </Select>
          </FormRow>
          <FormRow label="Địa chỉ">
            <Input placeholder="Hà Nội" {...register("address")} />
          </FormRow>
        </div>

        <FormRow label="Mật khẩu" required error={errors.password?.message}>
          <Input
            type="password"
            placeholder="Tối thiểu 6 ký tự"
            {...register("password", { required: "Vui lòng nhập mật khẩu", minLength: { value: 6, message: "Tối thiểu 6 ký tự" } })}
          />
        </FormRow>

        <FormRow label="Xác nhận mật khẩu" required error={errors.confirmPassword?.message}>
          <Input
            type="password"
            placeholder="Nhập lại mật khẩu"
            {...register("confirmPassword", {
              required: "Vui lòng xác nhận mật khẩu",
              validate: (v) => v === watch("password") || "Mật khẩu xác nhận không khớp",
            })}
          />
        </FormRow>

        <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
          Đăng ký
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-faint">
        Đã có tài khoản?{" "}
        <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-700">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
