import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { HiOutlineArrowLeft, HiOutlinePlus, HiOutlineTrash, HiOutlineCalendar } from "react-icons/hi";
import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Avatar from "../../components/ui/Avatar";
import { FormRow, Input, Textarea } from "../../components/ui/Field";
import { TableShell, Th, Td, Tr } from "../../components/ui/Table";
import { Spinner, EmptyState } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Badge } from "../../components/app/Badge";
import { DateFieldRHF } from "../../components/app/DateField";
import { toISODate } from "@/lib/date";
import { ComboboxFieldRHF } from "../../components/app/ComboboxField";
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
    await adminService.deleteSchedule(scheduleId, { doctorId: id });
    toast.success("Đã xóa lịch làm việc");
    load();
  }

  async function handleDeleteLeave() {
    await adminService.deleteLeave(deleteLeaveTarget.id, { doctorId: id });
    toast.success("Đã hủy đánh dấu ngày nghỉ");
    setDeleteLeaveTarget(null);
    load();
  }

  if (loading) return <Spinner label="Đang tải thông tin bác sĩ…" />;
  if (!doctor) return <EmptyState title="Không tìm thấy bác sĩ" />;

  const latestIncome = salary?.monthly?.[salary.monthly.length - 1];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/doctors"><HiOutlineArrowLeft /> Quay lại danh sách bác sĩ</Link>
      </Button>

      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={doctor.fullName} src={doctor.avatarUrl} size="lg" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-headline">{doctor.fullName}</h2>
            {doctor.onLeaveToday && <Badge tone="sky" dot>Đang nghỉ hôm nay</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{doctor.degree} · {doctor.specialtyName} · {doctor.experienceYears} năm kinh nghiệm</p>
          <p className="mt-2 max-w-2xl text-sm">{doctor.description}</p>
        </div>
        <div className="rounded-tile bg-tile px-5 py-4 sm:text-right">
          <p className="text-xs text-muted-foreground">Thực nhận tháng gần nhất</p>
          <p className="text-headline tabular-nums">{formatCurrency(latestIncome?.received)}</p>
          {latestIncome?.dayoff > 0 && (
            <p className="mt-1 text-xs font-medium text-destructive">Nghỉ {latestIncome.dayoff} ngày trong tháng</p>
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
                      <Button variant="ghost-danger" size="icon" onClick={() => handleDeleteSchedule(s.id)} title="Xóa lịch" aria-label={`Xóa lịch ${WEEKDAY_LABEL[s.dayOfWeek]} ${s.startTime}–${s.endTime}`}>
                        <HiOutlineTrash />
                      </Button>
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
              <div key={m.month} className="flex items-center justify-between rounded-field bg-tile/60 px-4 py-3 text-sm">
                <div>
                  <span className="font-medium">Tháng {m.month.split("-")[1]}/{m.month.split("-")[0]}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">{m.dayon} ngày công{m.dayoff > 0 ? ` · nghỉ ${m.dayoff} ngày` : ""}</p>
                </div>
                <span className="font-bold tabular-nums">{formatCurrency(m.received)}</span>
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
          <div className="divide-y divide-border">
            {leaves.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-semibold">{formatDateLong(l.date)}</p>
                  <p className="text-sm text-muted-foreground">{l.reason}</p>
                  {l.affectedAppointments > 0 && (
                    <p className="mt-1 text-xs font-medium text-destructive">⚠ {l.affectedAppointments} lịch hẹn cần sắp xếp lại</p>
                  )}
                </div>
                <Button variant="ghost-danger" size="icon" className="shrink-0" onClick={() => setDeleteLeaveTarget(l)} title="Hủy ngày nghỉ" aria-label={`Hủy ngày nghỉ ${formatDateLong(l.date)}`}>
                  <HiOutlineTrash />
                </Button>
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

const ROOM_OPTIONS = ["Phòng khám 101", "Phòng khám 102", "Phòng khám 103", "Phòng khám Nhi"].map((r) => ({ value: r, label: r }));

function ScheduleFormModal({ open, onClose, doctorId, onSaved }) {
  const { register, control, handleSubmit, reset, formState: { isSubmitting } } = useForm({
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
          <ComboboxFieldRHF
            control={control}
            name="dayOfWeek"
            options={Object.entries(WEEKDAY_LABEL).filter(([k]) => k !== "0").map(([value, label]) => ({ value, label }))}
            placeholder="Chọn thứ"
          />
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
          <ComboboxFieldRHF control={control} name="room" options={ROOM_OPTIONS} placeholder="Tìm phòng khám…" />
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
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
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
          <DateFieldRHF control={control} name="date" min={toISODate(new Date())} placeholder="Chọn ngày nghỉ" rules={{ required: "Bắt buộc" }} />
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
