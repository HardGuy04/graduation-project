import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { Button } from "@/components/kit/button";
import { Card, CardHeader, Tile, DataItem } from "../../components/app/Surface";
import { FormRow, Input, Textarea } from "../../components/app/Field";
import { PageHeader } from "../../components/app/PageHeader";
import AvatarField from "../../components/app/AvatarField";
import { useAuth } from "../../context/AuthContext";
import { profileService } from "../../services/profileService";
import { authService } from "../../services/authService";

const BIO_MAX = 1000;

export default function DoctorProfile() {
  const { user, updateLocalUser } = useAuth();
  const { register, handleSubmit, reset, watch, formState: { isSubmitting, dirtyFields, errors } } = useForm({ defaultValues: user });
  const bioLength = (watch("bio") || "").length;
  const {
    register: registerPwd, handleSubmit: handleSubmitPwd, reset: resetPwd,
    formState: { errors: pwdErrors, isSubmitting: changingPwd },
  } = useForm();

  useEffect(() => { reset(user); }, [user]); // eslint-disable-line

  async function onSubmit(values) {
    try {
      // Chỉ gửi phần giới thiệu khi có sửa: chưa chạy migration 005 thì họ tên/SĐT vẫn lưu được
      const res = await profileService.updateProfile(user.id, { ...values, bio: dirtyFields.bio ? values.bio : undefined });
      updateLocalUser(res.data);
      toast.success("Cập nhật hồ sơ thành công");
    } catch (err) {
      toast.error(err.message || "Không lưu được hồ sơ");
    }
  }

  async function handleAvatarChange(file) {
    const res = file
      ? await profileService.uploadAvatar(file)
      : await profileService.updateProfile(user.id, { avatarUrl: null });
    updateLocalUser(res.data);
    toast.success(file ? "Đã cập nhật ảnh đại diện" : "Đã xóa ảnh đại diện");
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

      <Card className="space-y-6">
        <AvatarField name={user.fullName} src={user.avatarUrl} onChange={handleAvatarChange} />
        <Tile>
          <dl className="grid gap-4 sm:grid-cols-3">
            <DataItem label="Chuyên khoa">{user.specialtyName || "—"}</DataItem>
            <DataItem label="Học vị">{user.degree || "—"}</DataItem>
            <DataItem label="Kinh nghiệm">{user.experienceYears != null ? `${user.experienceYears} năm` : "—"}</DataItem>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Do quản trị viên quản lý — liên hệ Admin nếu cần điều chỉnh.</p>
        </Tile>
      </Card>

      <Card>
        <CardHeader title="Thông tin cá nhân" description="Thông tin liên hệ và phần giới thiệu hiển thị cho bệnh nhân" />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormRow label="Họ và tên"><Input autoComplete="name" {...register("fullName")} /></FormRow>
            <FormRow label="Số điện thoại"><Input type="tel" autoComplete="tel" {...register("phone")} /></FormRow>
          </div>
          <FormRow
            label="Giới thiệu bản thân"
            hint={`Hiển thị cho bệnh nhân khi chọn bác sĩ đặt lịch · ${bioLength}/${BIO_MAX}`}
            error={errors.bio?.message}
          >
            <Textarea
              rows={4}
              placeholder="Kinh nghiệm, thế mạnh chuyên môn, nơi từng công tác…"
              {...register("bio", { maxLength: { value: BIO_MAX, message: `Tối đa ${BIO_MAX} ký tự` } })}
            />
          </FormRow>
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
