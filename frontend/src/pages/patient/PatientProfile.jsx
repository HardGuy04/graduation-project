import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import AvatarUpload from "../../components/common/AvatarUpload";
import { FormRow, Input, Select } from "../../components/ui/Field";
import { useAuth } from "../../context/AuthContext";
import { profileService } from "../../services/profileService";
import { authService } from "../../services/authService";

export default function PatientProfile() {
  const { user, updateLocalUser } = useAuth();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: user });
  const {
    register: registerPwd, handleSubmit: handleSubmitPwd, reset: resetPwd,
    formState: { errors: pwdErrors, isSubmitting: changingPwd },
  } = useForm();

  useEffect(() => { reset(user); }, [user]); // eslint-disable-line

  async function onSubmit(values) {
    const res = await profileService.updateProfile(user.id, values);
    updateLocalUser(res.data);
    toast.success("Cập nhật hồ sơ thành công");
  }

  async function handleAvatarChange(avatarUrl) {
    const res = await profileService.updateProfile(user.id, { avatarUrl });
    updateLocalUser(res.data);
    toast.success(avatarUrl ? "Đã cập nhật ảnh đại diện" : "Đã xóa ảnh đại diện");
  }

  async function onChangePassword(values) {
    try {
      await authService.changePassword({ email: user.email, oldPassword: values.oldPassword, newPassword: values.newPassword });
      toast.success("Đổi mật khẩu thành công");
      resetPwd();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <Card>
        <AvatarUpload name={user.fullName} src={user.avatarUrl} color="#3F9683" onChange={handleAvatarChange} />
      </Card>

      <Card>
        <CardHeader title="Thông tin cá nhân" subtitle="Cập nhật thông tin liên hệ và nhân khẩu học" />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <FormRow label="Họ và tên"><Input {...register("fullName")} /></FormRow>
            <FormRow label="Số điện thoại"><Input {...register("phone")} /></FormRow>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <FormRow label="Ngày sinh"><Input type="date" {...register("dateOfBirth")} /></FormRow>
            <FormRow label="Giới tính">
              <Select {...register("gender")}>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </Select>
            </FormRow>
          </div>
          <FormRow label="Địa chỉ"><Input {...register("address")} /></FormRow>
          <div className="flex justify-end pt-2">
            <Button type="submit" loading={isSubmitting}>Lưu thay đổi</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Đổi mật khẩu" subtitle="Nên sử dụng mật khẩu mạnh, không trùng với tài khoản khác" />
        <form onSubmit={handleSubmitPwd(onChangePassword)} className="space-y-4">
          <FormRow label="Mật khẩu hiện tại" required error={pwdErrors.oldPassword?.message}>
            <Input type="password" {...registerPwd("oldPassword", { required: "Bắt buộc" })} />
          </FormRow>
          <FormRow label="Mật khẩu mới" required error={pwdErrors.newPassword?.message}>
            <Input type="password" {...registerPwd("newPassword", { required: "Bắt buộc", minLength: { value: 6, message: "Tối thiểu 6 ký tự" } })} />
          </FormRow>
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="secondary" loading={changingPwd}>Đổi mật khẩu</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
