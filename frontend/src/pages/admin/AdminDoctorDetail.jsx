import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { HiOutlineArrowLeft, HiOutlinePlus, HiOutlineTrash, HiOutlineCalendar } from "react-icons/hi";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Avatar from "../../components/ui/Avatar";
import { FormRow, Input, Select, Textarea } from "../../components/ui/Field";
import { TableShell, Th, Td, Tr } from "../../components/ui/Table";
import { Spinner, EmptyState } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { adminService } from "../../services/adminService";
import { formatCurrency, formatDateLong } from "../../utils/formatters";
import { WEEKDAY_LABEL } from "../../utils/constants";

export default function AdminDoctorDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState(null);
  const [salary, setSalary] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [deleteLeaveTarget, setDeleteLeaveTarget] = useState(null);

  async function load() {
    const [d, s, l] = await Promise.all([
      adminService.getDoctorDetail(id),
      adminService.getSalaryStats(),
      adminService.getLeaves({ doctorId: id }),
    ]);
    setDoctor(d.data);
    setSalary(s.data.find((x) => x.doctorId === Number(id)));
    setLeaves(l.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  async function handleDeleteSchedule(scheduleId) {
    await adminService.deleteSchedule(scheduleId);
    toast.success("Đã xóa lịch làm việc");
    load();
  }

  async function handleDeleteLeave() {
    await adminService.deleteLeave(deleteLeaveTarget.id);
    toast.success("Đã hủy đánh dấu ngày nghỉ");
    setDeleteLeaveTarget(null);
    load();
  }

  if (loading) return <Spinner label="Đang tải thông tin bác sĩ…" />;
  if (!doctor) return <EmptyState title="Không tìm thấy bác sĩ" />;

  const latestIncome = salary?.monthly?.[salary.monthly.length - 1];

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/admin/doctors" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-teal-600">
        <HiOutlineArrowLeft className="h-4 w-4" /> Quay lại danh sách bác sĩ
      </Link>

      <Card className="flex flex-col sm:flex-row sm:items-center gap-5">
        <Avatar name={doctor.fullName} color={doctor.avatarColor} src={doctor.avatarUrl} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-extrabold font-display text-ink">{doctor.fullName}</h2>
            {doctor.onLeaveToday && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-2.5 py-1 text-xs font-semibold text-gold-600">
                <span className="h-1.5 w-1.5 rounded-full bg-current" /> Đang nghỉ hôm nay
              </span>
            )}
          </div>
          <p className="text-sm text-ink-faint mt-0.5">{doctor.degree} · {doctor.specialtyName} · {doctor.experienceYears} năm kinh nghiệm</p>
          <p className="text-sm text-ink-soft mt-2 max-w-2xl">{doctor.description}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-faint">Thực nhận tháng gần nhất</p>
          <p className="text-2xl font-extrabold font-display text-teal-600">{formatCurrency(latestIncome?.received)}</p>
          {latestIncome?.dayoff > 0 && (
            <p className="text-xs text-clay-500 mt-1">Nghỉ {latestIncome.dayoff} ngày trong tháng</p>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Lịch làm việc trong tuần"
            subtitle="Khung giờ khám cố định hàng tuần"
            action={<Button size="sm" onClick={() => setScheduleModalOpen(true)}><HiOutlinePlus className="h-4 w-4" /> Thêm lịch</Button>}
          />
          {doctor.schedules.length === 0 ? (
            <EmptyState title="Chưa có lịch làm việc" description="Thêm khung giờ làm việc cho bác sĩ này." />
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>Thứ</Th><Th>Giờ khám</Th><Th>Phòng</Th><Th>Số BN tối đa</Th><Th></Th>
                </tr>
              </thead>
              <tbody>
                {doctor.schedules.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-semibold">{WEEKDAY_LABEL[s.dayOfWeek]}</Td>
                    <Td>{s.startTime} – {s.endTime}</Td>
                    <Td>{s.room}</Td>
                    <Td>{s.maxPatients}</Td>
                    <Td className="text-right">
                      <button onClick={() => handleDeleteSchedule(s.id)} className="p-1.5 rounded-lg text-ink-faint hover:bg-clay-50 hover:text-clay-500">
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Thu nhập 6 tháng gần nhất" subtitle="Thực nhận = Lương cơ bản quy đổi theo ngày công + Thưởng" />
          <div className="space-y-2.5">
            {salary?.monthly?.map((m) => (
              <div key={m.month} className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm">
                <div>
                  <span className="font-medium text-ink-soft">Tháng {m.month.split("-")[1]}/{m.month.split("-")[0]}</span>
                  <p className="text-xs text-ink-faint mt-0.5">{m.dayon} ngày công{m.dayoff > 0 ? ` · nghỉ ${m.dayoff} ngày` : ""}</p>
                </div>
                <span className="font-bold text-ink">{formatCurrency(m.received)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Lịch nghỉ đã đăng ký"
          subtitle="Đánh dấu ngày bác sĩ xin nghỉ — hệ thống sẽ tự chặn đặt lịch mới vào ngày đó"
          action={<Button size="sm" variant="secondary" onClick={() => setLeaveModalOpen(true)}><HiOutlineCalendar className="h-4 w-4" /> Đánh dấu nghỉ</Button>}
        />
        {leaves.length === 0 ? (
          <EmptyState icon={HiOutlineCalendar} title="Chưa có ngày nghỉ nào sắp tới" description="Đánh dấu khi bác sĩ báo xin nghỉ để tránh nhận nhầm lịch hẹn." />
        ) : (
          <div className="divide-y divide-slate-100">
            {leaves.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold text-ink">{formatDateLong(l.date)}</p>
                  <p className="text-sm text-ink-faint">{l.reason}</p>
                  {l.affectedAppointments > 0 && (
                    <p className="text-xs text-clay-500 font-medium mt-1">⚠ {l.affectedAppointments} lịch hẹn cần sắp xếp lại</p>
                  )}
                </div>
                <button onClick={() => setDeleteLeaveTarget(l)} className="p-2 rounded-lg text-ink-faint hover:bg-clay-50 hover:text-clay-500 shrink-0">
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ScheduleFormModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        doctorId={doctor.id}
        onSaved={() => { setScheduleModalOpen(false); load(); }}
      />

      <LeaveFormModal
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        doctorId={doctor.id}
        onSaved={() => { setLeaveModalOpen(false); load(); }}
      />

      <ConfirmDialog
        open={!!deleteLeaveTarget}
        onClose={() => setDeleteLeaveTarget(null)}
        onConfirm={handleDeleteLeave}
        danger
        title="Hủy đánh dấu ngày nghỉ"
        description={`Bỏ đánh dấu nghỉ ngày ${deleteLeaveTarget ? formatDateLong(deleteLeaveTarget.date) : ""}?`}
        confirmLabel="Hủy đánh dấu"
      />
    </div>
  );
}

function ScheduleFormModal({ open, onClose, doctorId, onSaved }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { dayOfWeek: 1, startTime: "08:00", endTime: "12:00", slotDuration: 30, maxPatients: 8, room: "Phòng khám 101" },
  });

  useEffect(() => { if (open) reset(); }, [open]); // eslint-disable-line

  async function onSubmit(values) {
    await adminService.createSchedule({ ...values, doctorId });
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Thêm lịch làm việc">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormRow label="Thứ trong tuần">
          <Select {...register("dayOfWeek")}>
            {Object.entries(WEEKDAY_LABEL).filter(([k]) => k !== "0").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Giờ bắt đầu"><Input type="time" {...register("startTime")} /></FormRow>
          <FormRow label="Giờ kết thúc"><Input type="time" {...register("endTime")} /></FormRow>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Thời lượng / lượt (phút)"><Input type="number" min={10} {...register("slotDuration")} /></FormRow>
          <FormRow label="Số bệnh nhân tối đa"><Input type="number" min={1} {...register("maxPatients")} /></FormRow>
        </div>
        <FormRow label="Phòng khám">
          <Select {...register("room")}>
            <option>Phòng khám 101</option>
            <option>Phòng khám 102</option>
            <option>Phòng khám 103</option>
            <option>Phòng khám Nhi</option>
          </Select>
        </FormRow>
        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit" loading={isSubmitting}>Thêm lịch</Button>
        </div>
      </form>
    </Modal>
  );
}

function LeaveFormModal({ open, onClose, doctorId, onSaved }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { date: new Date().toISOString().slice(0, 10), reason: "" },
  });

  useEffect(() => { if (open) reset({ date: new Date().toISOString().slice(0, 10), reason: "" }); }, [open]); // eslint-disable-line

  async function onSubmit(values) {
    try {
      const res = await adminService.createLeave({ ...values, doctorId });
      toast.success(res.message || "Đã đánh dấu ngày nghỉ");
      onSaved();
    } catch (err) {
      toast.error(err.message || "Không thể đánh dấu ngày nghỉ");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Đánh dấu bác sĩ nghỉ" subtitle="Hệ thống sẽ tự chặn đặt lịch mới vào ngày này">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormRow label="Ngày nghỉ" required error={errors.date?.message}>
          <Input type="date" min={new Date().toISOString().slice(0, 10)} {...register("date", { required: "Bắt buộc" })} />
        </FormRow>
        <FormRow label="Lý do nghỉ" hint="VD: Nghỉ phép, nghỉ ốm, đi công tác…">
          <Textarea rows={2} placeholder="Lý do nghỉ (không bắt buộc)" {...register("reason")} />
        </FormRow>
        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit" loading={isSubmitting}>Xác nhận</Button>
        </div>
      </form>
    </Modal>
  );
}
