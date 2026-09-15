import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { HiOutlinePlus, HiOutlineSearch, HiOutlinePencil, HiOutlineEye, HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Avatar from "../../components/ui/Avatar";
import { AccountStatusBadge } from "../../components/ui/StatusBadge";
import { TableShell, Th, Td, Tr } from "../../components/ui/Table";
import { FormRow, Input, Select, Textarea } from "../../components/ui/Field";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { adminService } from "../../services/adminService";
import { commonService } from "../../services/commonService";
import { formatCurrency } from "../../utils/formatters";

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
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <Input placeholder="Tìm bác sĩ theo tên, email…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select className="max-w-[200px]" value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}>
            <option value="">Tất cả chuyên khoa</option>
            {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <HiOutlinePlus className="h-4 w-4" /> Thêm bác sĩ
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
                    <Avatar name={d.fullName} color={d.avatarColor} src={d.avatarUrl} size="sm" />
                    <div>
                      <p className="font-semibold">{d.fullName}</p>
                      <p className="text-xs text-ink-faint">{d.email}</p>
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
                      <span className="inline-flex items-center gap-1 rounded-full border border-gold-200 bg-gold-50 px-2 py-0.5 text-[11px] font-semibold text-gold-600">
                        Nghỉ hôm nay
                      </span>
                    )}
                  </div>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    <Link to={`/admin/doctors/${d.id}`} className="p-2 rounded-lg text-ink-faint hover:bg-slate-100 hover:text-teal-600" title="Xem chi tiết">
                      <HiOutlineEye className="h-4 w-4" />
                    </Link>
                    <button onClick={() => { setEditing(d); setModalOpen(true); }} className="p-2 rounded-lg text-ink-faint hover:bg-slate-100 hover:text-teal-600" title="Sửa">
                      <HiOutlinePencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setToggleTarget(d)} className="p-2 rounded-lg text-ink-faint hover:bg-slate-100 hover:text-clay-500" title={d.status === "active" ? "Khóa tài khoản" : "Mở khóa"}>
                      {d.status === "active" ? <HiOutlineLockClosed className="h-4 w-4" /> : <HiOutlineLockOpen className="h-4 w-4" />}
                    </button>
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

function DoctorFormModal({ open, onClose, doctor, specialties, onSaved }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (open) {
      reset(doctor || { specialtyId: specialties[0]?.id, experienceYears: 1, baseSalary: 15000000 });
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
            <Select {...register("specialtyId", { required: true })}>
              {specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormRow>
          <FormRow label="Học vị">
            <Select {...register("degree")}>
              <option>Bác sĩ</option>
              <option>Thạc sĩ</option>
              <option>Chuyên khoa I</option>
              <option>Chuyên khoa II</option>
              <option>Tiến sĩ</option>
            </Select>
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
