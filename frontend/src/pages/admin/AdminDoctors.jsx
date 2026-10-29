import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { HiOutlinePlus, HiOutlinePencil, HiOutlineEye, HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Avatar from "../../components/ui/Avatar";
import { AccountStatusBadge } from "../../components/ui/StatusBadge";
import { TableShell, Th, Td, Tr } from "../../components/ui/Table";
import { FormRow, Input, Textarea } from "../../components/ui/Field";
import { SearchInput } from "../../components/app/Field";
import { ComboboxField, ComboboxFieldRHF } from "../../components/app/ComboboxField";
import { Badge } from "../../components/app/Badge";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { adminService } from "../../services/adminService";
import { commonService } from "../../services/commonService";

export default function AdminDoctors() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [q, setQ] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toggleTarget, setToggleTarget] = useState(null);

  async function load() {
    setLoading(true);
    const [d, s] = await Promise.all([
      adminService.getDoctors({ q, specialtyId: specialtyFilter || undefined }),
      commonService.getSpecialties(),
    ]);
    setDoctors(d.data);
    setSpecialties(s.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [q, specialtyFilter]); // eslint-disable-line

  async function handleToggle() {
    await adminService.toggleDoctorStatus(toggleTarget.id);
    toast.success("Đã cập nhật trạng thái tài khoản");
    setToggleTarget(null);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <SearchInput className="w-full max-w-xs flex-1" label="Tìm bác sĩ" placeholder="Tìm bác sĩ theo tên, email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <ComboboxField
            className="sm:w-[240px]"
            aria-label="Lọc theo chuyên khoa"
            value={specialtyFilter}
            onChange={setSpecialtyFilter}
            options={specialties.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Tất cả chuyên khoa"
            showClear
          />
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <HiOutlinePlus /> Thêm bác sĩ
        </Button>
      </div>

      {loading ? (
        <Spinner label="Đang tải danh sách bác sĩ…" />
      ) : doctors.length === 0 ? (
        <EmptyState title="Không tìm thấy bác sĩ nào" description="Thử điều chỉnh bộ lọc hoặc thêm bác sĩ mới." />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Bác sĩ</Th>
              <Th>Chuyên khoa</Th>
              <Th>Học vị</Th>
              <Th>Kinh nghiệm</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((d) => (
              <Tr key={d.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={d.fullName} src={d.avatarUrl} size="sm" />
                    <div>
                      <p className="font-semibold">{d.fullName}</p>
                      <p className="text-xs text-muted-foreground">{d.email}</p>
                    </div>
                  </div>
                </Td>
                <Td>{d.specialtyName}</Td>
                <Td>{d.degree}</Td>
                <Td>{d.experienceYears} năm</Td>
                <Td>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <AccountStatusBadge status={d.status} />
                    {d.onLeaveToday && (
                      <Badge tone="sky">Nghỉ hôm nay</Badge>
                    )}
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button asChild variant="ghost" size="icon" title="Xem chi tiết">
                      <Link to={`/admin/doctors/${d.id}`} aria-label={`Xem chi tiết ${d.fullName}`}><HiOutlineEye /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(d); setModalOpen(true); }} title="Sửa" aria-label={`Sửa ${d.fullName}`}>
                      <HiOutlinePencil />
                    </Button>
                    <Button
                      variant={d.status === "active" ? "ghost-danger" : "ghost"}
                      size="icon"
                      onClick={() => setToggleTarget(d)}
                      title={d.status === "active" ? "Khóa tài khoản" : "Mở khóa"}
                      aria-label={`${d.status === "active" ? "Khóa tài khoản" : "Mở khóa"} ${d.fullName}`}
                    >
                      {d.status === "active" ? <HiOutlineLockClosed /> : <HiOutlineLockOpen />}
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <DoctorFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        doctor={editing}
        specialties={specialties}
        onSaved={() => { setModalOpen(false); load(); }}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        danger={toggleTarget?.status === "active"}
        title={toggleTarget?.status === "active" ? "Khóa tài khoản bác sĩ" : "Mở khóa tài khoản"}
        description={`Bạn có chắc chắn muốn ${toggleTarget?.status === "active" ? "khóa" : "mở khóa"} tài khoản của ${toggleTarget?.fullName}?`}
        confirmLabel={toggleTarget?.status === "active" ? "Khóa tài khoản" : "Mở khóa"}
      />
    </div>
  );
}

const DEGREE_OPTIONS = ["Bác sĩ", "Thạc sĩ", "Chuyên khoa I", "Chuyên khoa II", "Tiến sĩ"].map((d) => ({ value: d, label: d }));

function DoctorFormModal({ open, onClose, doctor, specialties, onSaved }) {
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (open) {
      reset(doctor
        ? { ...doctor, degree: doctor.degree || DEGREE_OPTIONS[0].value }
        : { specialtyId: specialties[0]?.id, degree: DEGREE_OPTIONS[0].value, experienceYears: 1, baseSalary: 15000000 });
    }
  }, [open, doctor]); // eslint-disable-line

  async function onSubmit(values) {
    try {
      if (doctor) {
        await adminService.updateDoctor(doctor.id, values);
        toast.success("Cập nhật thông tin bác sĩ thành công");
      } else {
        await adminService.createDoctor(values);
        toast.success("Thêm bác sĩ mới thành công");
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || "Có lỗi xảy ra");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={doctor ? "Cập nhật thông tin bác sĩ" : "Thêm bác sĩ mới"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormRow label="Họ và tên" required error={errors.fullName?.message}>
          <Input {...register("fullName", { required: "Bắt buộc" })} />
        </FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Email" required error={errors.email?.message}>
            <Input type="email" disabled={!!doctor} {...register("email", { required: "Bắt buộc" })} />
          </FormRow>
          <FormRow label="Số điện thoại" required error={errors.phone?.message}>
            <Input {...register("phone", { required: "Bắt buộc" })} />
          </FormRow>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Chuyên khoa" required>
            <ComboboxFieldRHF
              control={control}
              name="specialtyId"
              rules={{ required: true }}
              options={specialties.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Tìm chuyên khoa…"
            />
          </FormRow>
          <FormRow label="Học vị">
            <ComboboxFieldRHF control={control} name="degree" options={DEGREE_OPTIONS} placeholder="Chọn học vị" />
          </FormRow>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Số năm kinh nghiệm">
            <Input type="number" min={0} {...register("experienceYears")} />
          </FormRow>
          <FormRow label="Lương cơ bản (đ)">
            <Input type="number" min={0} step={500000} {...register("baseSalary")} />
          </FormRow>
        </div>
        <FormRow label="Giới thiệu">
          <Textarea rows={3} {...register("description")} />
        </FormRow>
        {!doctor && (
          <FormRow label="Mật khẩu ban đầu" hint="Mặc định 123456 nếu để trống">
            <Input type="password" {...register("password")} />
          </FormRow>
        )}
        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit" loading={isSubmitting}>{doctor ? "Lưu thay đổi" : "Thêm bác sĩ"}</Button>
        </div>
      </form>
    </Modal>
  );
}
