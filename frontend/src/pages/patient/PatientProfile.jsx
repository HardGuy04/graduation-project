import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { Button } from "@/components/kit/button";
import { Card, CardHeader } from "../../components/app/Surface";
import { FormRow, Input } from "../../components/app/Field";
import { ComboboxFieldRHF } from "../../components/app/ComboboxField";
import { GENDER_OPTIONS } from "../../utils/constants";
import { DateFieldRHF } from "../../components/app/DateField";
import { toISODate } from "@/lib/date";
import { PageHeader } from "../../components/app/PageHeader";
import AvatarField from "../../components/app/AvatarField";
import { useAuth } from "../../context/AuthContext";
import { profileService } from "../../services/profileService";
import { authService } from "../../services/authService";

export default function PatientProfile() {
  const { user, updateLocalUser } = useAuth();
  const { register, control, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: user });
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Tài khoản" title="Hồ sơ cá nhân" description={user.email} />

      <Card>
        <AvatarField name={user.fullName} src={user.avatarUrl} onChange={handleAvatarChange} />
      </Card>

      <Card>
        <CardHeader title="Thông tin cá nhân" description="Cập nhật thông tin liên hệ và nhân khẩu học" />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormRow label="Họ và tên"><Input autoComplete="name" {...register("fullName")} /></FormRow>
            <FormRow label="Số điện thoại"><Input type="tel" autoComplete="tel" {...register("phone")} /></FormRow>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormRow label="Ngày sinh"><DateFieldRHF control={control} name="dateOfBirth" max={toISODate(new Date())} placeholder="Chọn ngày sinh" /></FormRow>
            <FormRow label="Giới tính">
              <ComboboxFieldRHF control={control} name="gender" options={GENDER_OPTIONS} placeholder="Chọn giới tính" />
            </FormRow>
          </div>
          <FormRow label="Địa chỉ"><Input autoComplete="street-address" {...register("address")} /></FormRow>
          <div className="flex justify-end pt-2">
            <Button type="submit" loading={isSubmitting}>Lưu thay đổi</Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Đổi mật khẩu" description="Nên sử dụng mật khẩu mạnh, không trùng với tài khoản khác" />
        <form onSubmit={handleSubmitPwd(onChangePassword)} className="space-y-4">
          <FormRow label="Mật khẩu hiện tại" required error={pwdErrors.oldPassword?.message}>
            <Input type="password" autoComplete="current-password" {...registerPwd("oldPassword", { required: "Bắt buộc" })} />
          </FormRow>
          <FormRow label="Mật khẩu mới" required error={pwdErrors.newPassword?.message}>
            <Input type="password" autoComplete="new-password" {...registerPwd("newPassword", { required: "Bắt buộc", minLength: { value: 6, message: "Tối thiểu 6 ký tự" } })} />
          </FormRow>
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="outline" loading={changingPwd}>Đổi mật khẩu</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
