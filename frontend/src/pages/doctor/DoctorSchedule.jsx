import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineCalendar, HiOutlineClock } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import { cn } from "@/lib/utils";
import { Card, CardHeader } from "../../components/app/Surface";
import { Badge } from "../../components/app/Badge";
import { FormRow, Input } from "../../components/app/Field";
import { ComboboxFieldRHF } from "../../components/app/ComboboxField";
import { DateFieldRHF } from "../../components/app/DateField";
import { AppDialog, ConfirmDialog } from "../../components/app/Dialog";
import { Empty, Loading } from "../../components/app/Feedback";
import { PageHeader } from "../../components/app/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { doctorService } from "../../services/doctorService";
import { WEEKDAY_LABEL } from "../../utils/constants";
import { formatDateLong } from "../../utils/formatters";

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const SHIFT_STATUS_OPTIONS = [
  { value: "active", label: "Đang hoạt động" },
  { value: "inactive", label: "Tạm ngưng" },
];
const EMPTY_SHIFT = { dayOfWeek: 1, startTime: "08:00", endTime: "12:00", slotDuration: 30, maxPatients: 10, status: "active" };

export default function DoctorSchedule() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [editing, setEditing] = useState(null); // null | { ...shift } (id undefined = tạo mới)
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [confirm, setConfirm] = useState(null); // { kind: "shift" | "leave", item }
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const [s, l] = await Promise.all([doctorService.getMySchedule(user.id), doctorService.getMyLeaves(user.id)]);
    setSchedules(s.data);
    setLeaves(l.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user.id]); // eslint-disable-line

  async function handleDelete() {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.kind === "shift") {
        await doctorService.deleteSchedule(confirm.item.id);
        toast.success("Đã xóa ca làm việc");
      } else {
        await doctorService.deleteLeave(confirm.item.id);
        toast.success("Đã hủy ngày nghỉ");
      }
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message || "Không thể xóa, vui lòng thử lại");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleStatus(shift) {
    try {
      await doctorService.updateSchedule(shift.id, { status: shift.status === "active" ? "inactive" : "active" });
      toast.success(shift.status === "active" ? "Đã tạm ngưng ca làm việc" : "Đã bật lại ca làm việc");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <Loading label="Đang tải lịch làm việc…" />;

  const byDay = WEEK.map((d) => ({
    day: d,
    slots: schedules.filter((s) => s.dayOfWeek === d).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
  const today = new Date().getDay();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Lịch làm việc"
        title="Ca làm việc hằng tuần"
        description="Bệnh nhân chỉ đặt được lịch trong các ca đang hoạt động. Ngày nghỉ sẽ chặn đặt lịch trong cả ngày."
        actions={
          <>
            <Button variant="outline" onClick={() => setLeaveOpen(true)}><HiOutlineCalendar /> Đăng ký nghỉ</Button>
            <Button onClick={() => setEditing({ ...EMPTY_SHIFT })}><HiOutlinePlus /> Thêm ca</Button>
          </>
        }
      />

      {schedules.length === 0 ? (
        <Empty
          icon={HiOutlineClock}
          title="Bạn chưa có ca làm việc nào"
          description="Thêm ca làm việc để bệnh nhân có thể đặt lịch với bạn."
          action={<Button onClick={() => setEditing({ ...EMPTY_SHIFT })}><HiOutlinePlus /> Thêm ca đầu tiên</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {byDay.map(({ day, slots }) => (
            <section key={day}
                aria-labelledby={`dow-${day}`}
                className={cn(
                  "flex h-full flex-col rounded-card border bg-card p-4",
                  day === today ? "border-primary" : "border-border"
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 id={`dow-${day}`} className="text-sm font-semibold">{WEEKDAY_LABEL[day]}</h2>
                  {day === today && <Badge tone="solid" className="px-2 py-0.5 text-[10px]">Hôm nay</Badge>}
                </div>

                {slots.length === 0 ? (
                  <p className="flex-1 text-sm text-muted-foreground">Nghỉ</p>
                ) : (
                  <ul className="flex-1 space-y-2">
                    {slots.map((s) => (
                      <li key={s.id} className={cn("rounded-tile p-3", s.status === "active" ? "bg-tile" : "border border-dashed border-input")}>
                        <p className={cn("text-sm font-semibold tabular-nums", s.status !== "active" && "text-muted-foreground line-through")}>
                          {s.startTime} – {s.endTime}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {s.slotDuration} phút/lượt · tối đa {s.maxPatients}
                        </p>
                        <div className="mt-2 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2.5 text-xs"
                            onClick={() => toggleStatus(s)}
                            aria-label={`${s.status === "active" ? "Tạm ngưng" : "Bật lại"} ca ${s.startTime}–${s.endTime} ${WEEKDAY_LABEL[day]}`}
                          >
                            {s.status === "active" ? "Tạm ngưng" : "Bật lại"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing({ ...s })}
                            aria-label={`Sửa ca ${s.startTime}–${s.endTime} ${WEEKDAY_LABEL[day]}`}
                          >
                            <HiOutlinePencil />
                          </Button>
                          <Button
                            variant="ghost-danger"
                            size="icon"
                            onClick={() => setConfirm({ kind: "shift", item: s })}
                            aria-label={`Xóa ca ${s.startTime}–${s.endTime} ${WEEKDAY_LABEL[day]}`}
                          >
                            <HiOutlineTrash />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
          ))}
        </div>
      )}

      <Card>
        <CardHeader
          title="Ngày nghỉ"
          description="Hệ thống tự chặn bệnh nhân đặt lịch vào các ngày này. Lịch hẹn đã có trong ngày không tự hủy."
          action={<Button variant="outline" size="sm" onClick={() => setLeaveOpen(true)}><HiOutlinePlus /> Thêm ngày nghỉ</Button>}
        />
        {leaves.length === 0 ? (
          <Empty icon={HiOutlineCalendar} title="Không có ngày nghỉ nào" />
        ) : (
          <ul className="divide-y divide-border">
            {leaves.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold capitalize">{formatDateLong(l.date)}</p>
                  <p className="truncate text-sm text-muted-foreground">{l.reason || "Không ghi lý do"}</p>
                </div>
                <Button
                  variant="ghost-danger"
                  size="icon"
                  onClick={() => setConfirm({ kind: "leave", item: l })}
                  aria-label={`Hủy ngày nghỉ ${formatDateLong(l.date)}`}
                >
                  <HiOutlineTrash />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ShiftDialog shift={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      <LeaveDialog open={leaveOpen} onClose={() => setLeaveOpen(false)} onSaved={() => { setLeaveOpen(false); load(); }} />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleDelete}
        loading={deleting}
        danger
        title={confirm?.kind === "leave" ? "Hủy ngày nghỉ" : "Xóa ca làm việc"}
        description={
          confirm?.kind === "leave"
            ? `Hủy ngày nghỉ ${formatDateLong(confirm.item.date)}? Bệnh nhân sẽ có thể đặt lịch lại vào ngày này.`
            : confirm
              ? `Xóa ca ${confirm.item.startTime}–${confirm.item.endTime} ${WEEKDAY_LABEL[confirm.item.dayOfWeek]}? Lịch hẹn đã đặt không bị ảnh hưởng.`
              : ""
        }
        confirmLabel={confirm?.kind === "leave" ? "Hủy ngày nghỉ" : "Xóa ca"}
      />
    </div>
  );
}

function ShiftDialog({ shift, onClose, onSaved }) {
  const isEdit = !!shift?.id;
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: EMPTY_SHIFT });

  useEffect(() => {
    if (shift) reset({ ...EMPTY_SHIFT, ...shift, dayOfWeek: String(shift.dayOfWeek) });
  }, [shift, reset]);

  async function onSubmit(values) {
    const payload = {
      dayOfWeek: Number(values.dayOfWeek),
      startTime: values.startTime,
      endTime: values.endTime,
      slotDuration: values.slotDuration,
      maxPatients: values.maxPatients,
      status: values.status,
    };
    try {
      if (isEdit) await doctorService.updateSchedule(shift.id, payload);
      else await doctorService.createSchedule(payload);
      toast.success(isEdit ? "Đã cập nhật ca làm việc" : "Đã thêm ca làm việc");
      onSaved();
    } catch (err) {
      toast.error(err.message || "Không thể lưu ca làm việc");
    }
  }

  return (
    <AppDialog
      open={!!shift}
      onClose={onClose}
      title={isEdit ? "Sửa ca làm việc" : "Thêm ca làm việc"}
      description="Giờ theo múi giờ phòng khám (GMT+7)"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="submit" form="shift-form" loading={isSubmitting}>{isEdit ? "Lưu thay đổi" : "Thêm ca"}</Button>
        </>
      }
    >
      <form id="shift-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormRow label="Thứ trong tuần" required>
          <ComboboxFieldRHF
            control={control}
            name="dayOfWeek"
            rules={{ required: true }}
            options={WEEK.map((d) => ({ value: String(d), label: WEEKDAY_LABEL[d] }))}
            placeholder="Chọn thứ"
          />
        </FormRow>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Bắt đầu" required error={errors.startTime?.message}>
            <Input type="time" step={300} {...register("startTime", { required: "Bắt buộc" })} />
          </FormRow>
          <FormRow label="Kết thúc" required error={errors.endTime?.message}>
            <Input
              type="time"
              step={300}
              {...register("endTime", {
                required: "Bắt buộc",
                validate: (v, all) => v > all.startTime || "Giờ kết thúc phải sau giờ bắt đầu",
              })}
            />
          </FormRow>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormRow label="Thời lượng/lượt (phút)" required error={errors.slotDuration?.message}>
            <Input type="number" min={5} max={240} {...register("slotDuration", { required: "Bắt buộc", min: { value: 5, message: "Tối thiểu 5" }, max: { value: 240, message: "Tối đa 240" } })} />
          </FormRow>
          <FormRow label="Số bệnh nhân tối đa" required error={errors.maxPatients?.message}>
            <Input type="number" min={1} max={500} {...register("maxPatients", { required: "Bắt buộc", min: { value: 1, message: "Tối thiểu 1" } })} />
          </FormRow>
        </div>
        <FormRow label="Trạng thái">
          <ComboboxFieldRHF control={control} name="status" options={SHIFT_STATUS_OPTIONS} placeholder="Chọn trạng thái" />
        </FormRow>
      </form>
    </AppDialog>
  );
}

function LeaveDialog({ open, onClose, onSaved }) {
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { date: "", reason: "" } });
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => { if (open) reset({ date: "", reason: "" }); }, [open, reset]);

  async function onSubmit(values) {
    try {
      const res = await doctorService.createLeave(values);
      const affected = res.data?.affectedAppointments;
      toast.success(affected ? `Đã đăng ký nghỉ. Có ${affected} lịch hẹn trong ngày cần xử lý.` : "Đã đăng ký ngày nghỉ");
      onSaved();
    } catch (err) {
      toast.error(err.message || "Không thể đăng ký ngày nghỉ");
    }
  }

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Đăng ký ngày nghỉ"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="submit" form="leave-form" loading={isSubmitting}>Đăng ký</Button>
        </>
      }
    >
      <form id="leave-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormRow label="Ngày nghỉ" required error={errors.date?.message}>
          <DateFieldRHF control={control} name="date" min={todayStr} placeholder="Chọn ngày nghỉ" rules={{ required: "Vui lòng chọn ngày" }} />
        </FormRow>
        <FormRow label="Lý do" error={errors.reason?.message}>
          <Input placeholder="VD: Hội thảo chuyên môn" {...register("reason", { maxLength: { value: 255, message: "Tối đa 255 ký tự" } })} />
        </FormRow>
      </form>
    </AppDialog>
  );
}
