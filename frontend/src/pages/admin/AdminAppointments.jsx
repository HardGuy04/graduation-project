import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { HiOutlinePlus, HiOutlineCheck, HiOutlineX, HiOutlineBan } from "react-icons/hi";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Tabs from "../../components/ui/Tabs";
import { AppointmentStatusBadge } from "../../components/ui/StatusBadge";
import { TableShell, Th, Td, Tr } from "../../components/ui/Table";
import { FormRow, Input, Textarea } from "../../components/ui/Field";
import { DateFieldRHF } from "../../components/app/DateField";
import { ComboboxField, ComboboxFieldRHF } from "../../components/app/ComboboxField";
import { SearchInput } from "../../components/app/Field";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { adminService } from "../../services/adminService";
import { commonService } from "../../services/commonService";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "rejected", label: "Từ chối" },
  { value: "no_show", label: "Không đến" },
];

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Đăng ký mới nhất" },
  { value: "createdAt:asc", label: "Đăng ký cũ nhất" },
  { value: "startAt:asc", label: "Giờ khám sớm nhất" },
  { value: "startAt:desc", label: "Giờ khám muộn nhất" },
];

const HOUR = 3_600_000;

function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function clock(ms, now) {
  const d = new Date(ms);
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return new Date(now).toDateString() === d.toDateString() ? time : `${time} ${d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`;
}

function remaining(ms) {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `còn ${min} phút`;
  if (min < 48 * 60) return `còn ${Math.round(min / 60)} giờ`;
  return `còn ${Math.round(min / 1440)} ngày`;
}

/** Hạn xử lý: lịch chờ phải duyệt trước giờ khám; quá giờ khám + N phút hệ thống tự hủy / tự ghi không đến. */
function Deadline({ appt, now }) {
  const start = new Date(appt.startAt).getTime();
  const auto = appt.autoCloseAt ? new Date(appt.autoCloseAt).getTime() : null;
  if (!["pending", "confirmed"].includes(appt.status) || Number.isNaN(start)) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const pending = appt.status === "pending";
  if (now < start) {
    const urgent = pending && start - now <= 2 * HOUR;
    return (
      <div className="text-xs leading-5">
        <p className={cn("font-semibold", urgent ? "text-destructive" : pending ? "text-foreground" : "text-muted-foreground")}>
          {pending ? `Duyệt trước ${clock(start, now)}` : `Check-in từ ${clock(start, now)}`}
        </p>
        <p className="text-muted-foreground">{remaining(start - now)}</p>
      </div>
    );
  }
  return (
    <div className="text-xs leading-5">
      <p className="font-semibold text-destructive">{pending ? "Quá giờ, chưa duyệt" : "Quá giờ, chưa check-in"}</p>
      {auto && (
        <p className="text-muted-foreground">
          {now < auto ? `${pending ? "Tự hủy" : "Tự ghi không đến"} lúc ${clock(auto, now)}` : "Đang chờ hệ thống tự đóng"}
        </p>
      )}
    </div>
  );
}

export default function AdminAppointments() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // {type, appt}
  const now = useNow();

  async function load() {
    setLoading(true);
    const [sortBy, order] = sort.split(":");
    const res = await adminService.getAppointments({ status: status || undefined, q: q || undefined, sortBy, sort: order });
    setList(res.data);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [status, q, sort]); // eslint-disable-line

  async function runAction() {
    const { type, appt } = confirmAction;
    const fn = { confirm: adminService.confirmAppointment, reject: adminService.rejectAppointment, cancel: adminService.cancelAppointment }[type];
    try {
      await fn(appt.id);
      toast.success("Cập nhật lịch hẹn thành công");
    } catch (err) {
      toast.error(err.message || "Không cập nhật được lịch hẹn");
    }
    setConfirmAction(null);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Tabs tabs={STATUS_TABS} active={status} onChange={setStatus} />
        <div className="flex flex-wrap gap-3">
          <SearchInput className="w-full max-w-xs flex-1" label="Tìm lịch hẹn" placeholder="Tìm theo tên/SĐT bệnh nhân…" value={q} onChange={(e) => setQ(e.target.value)} />
          <ComboboxField
            className="w-[220px]"
            aria-label="Sắp xếp lịch hẹn"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(v) => v && setSort(v)}
            placeholder="Sắp xếp"
          />
          <Button onClick={() => setModalOpen(true)}><HiOutlinePlus /> Tạo lịch hẹn</Button>
        </div>
      </div>

      {loading ? (
        <Spinner label="Đang tải danh sách lịch hẹn…" />
      ) : list.length === 0 ? (
        <EmptyState title="Không có lịch hẹn nào" description="Chưa có lịch hẹn phù hợp với bộ lọc hiện tại." />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Bệnh nhân</Th><Th>Bác sĩ</Th><Th>Ngày khám</Th><Th>Giờ</Th><Th>Phòng khám</Th><Th>Lý do khám</Th><Th>Đăng ký lúc</Th><Th>Trạng thái</Th><Th>Hạn xử lý</Th><Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <Tr key={a.id}>
                <Td className="font-semibold">{a.patientName}</Td>
                <Td>{a.doctorName}<br /><span className="text-xs text-muted-foreground">{a.doctorSpecialty}</span></Td>
                <Td>{formatDate(a.date)}</Td>
                <Td>{a.startTime}</Td>
                <Td>
                  {a.roomName ? (
                    <span className="text-sm font-medium">{a.roomName}</span>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">Chưa xếp phòng</span>
                  )}
                </Td>
                <Td className="max-w-[220px] truncate" title={a.reason}>{a.reason}</Td>
                <Td className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</Td>
                <Td><AppointmentStatusBadge status={a.status} /></Td>
                <Td className="min-w-[150px]"><Deadline appt={a} now={now} /></Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    {a.status === "pending" && (
                      <>
                        {now < new Date(a.startAt).getTime() && (
                          <Button variant="ghost" size="icon" className="text-accent hover:bg-accent-soft" onClick={() => setConfirmAction({ type: "confirm", appt: a })} title="Xác nhận" aria-label={`Xác nhận lịch của ${a.patientName}`}>
                            <HiOutlineCheck />
                          </Button>
                        )}
                        <Button variant="ghost-danger" size="icon" onClick={() => setConfirmAction({ type: "reject", appt: a })} title="Từ chối" aria-label={`Từ chối lịch của ${a.patientName}`}>
                          <HiOutlineX />
                        </Button>
                      </>
                    )}
                    {["pending", "confirmed"].includes(a.status) && (
                      <Button variant="ghost" size="icon" onClick={() => setConfirmAction({ type: "cancel", appt: a })} title="Hủy lịch" aria-label={`Hủy lịch của ${a.patientName}`}>
                        <HiOutlineBan />
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <CreateAppointmentModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} />

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={runAction}
        danger={confirmAction?.type !== "confirm"}
        title={{ confirm: "Xác nhận lịch hẹn", reject: "Từ chối lịch hẹn", cancel: "Hủy lịch hẹn" }[confirmAction?.type]}
        description={`Bạn có chắc chắn muốn ${{ confirm: "xác nhận", reject: "từ chối", cancel: "hủy" }[confirmAction?.type]} lịch hẹn của ${confirmAction?.appt?.patientName}?`}
        confirmLabel="Xác nhận"
      />
    </div>
  );
}

function CreateAppointmentModal({ open, onClose, onSaved }) {
  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [rooms, setRooms] = useState(null);
  const date = watch("date");
  const startTime = watch("startTime");

  useEffect(() => {
    if (!open) return;
    reset({ date: new Date().toISOString().slice(0, 10) });
    (async () => {
      const [p, d] = await Promise.all([adminService.getPatients(), commonService.getPublicDoctors()]);
      setPatients(p.data);
      setDoctors(d.data);
    })();
  }, [open]); // eslint-disable-line

  useEffect(() => {
    if (!open || !date || !startTime) { setRooms(null); return; }
    setRooms(null);
    adminService.getAvailableRooms(date, startTime).then((res) => setRooms(res.data));
  }, [open, date, startTime]);

  async function onSubmit(values) {
    try {
      await adminService.createAppointment(values);
      toast.success("Tạo lịch hẹn thành công");
      onSaved();
    } catch (err) {
      toast.error(err.message || "Không thể tạo lịch hẹn");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Tạo lịch hẹn tại quầy" subtitle="Dành cho bệnh nhân đặt lịch trực tiếp">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormRow label="Bệnh nhân" required error={errors.patientId && "Vui lòng chọn bệnh nhân"}>
          <ComboboxFieldRHF
            control={control}
            name="patientId"
            rules={{ required: true }}
            options={patients.map((p) => ({ value: p.id, label: `${p.fullName} · ${p.phone}` }))}
            placeholder="Tìm theo tên hoặc SĐT…"
          />
        </FormRow>
        <FormRow label="Bác sĩ" required error={errors.doctorId && "Vui lòng chọn bác sĩ"}>
          <ComboboxFieldRHF
            control={control}
            name="doctorId"
            rules={{ required: true }}
            options={doctors.map((d) => ({ value: d.id, label: `${d.fullName} · ${d.specialtyName}` }))}
            placeholder="Tìm theo tên hoặc chuyên khoa…"
          />
        </FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Ngày khám" required error={errors.date && "Vui lòng chọn ngày"}>
            <DateFieldRHF control={control} name="date" rules={{ required: true }} placeholder="Chọn ngày khám" />
          </FormRow>
          <FormRow label="Giờ khám" required><Input type="time" {...register("startTime", { required: true })} /></FormRow>
        </div>
        <FormRow
          label="Phòng khám"
          required
          error={errors.roomId?.message}
          hint={!date || !startTime ? "Chọn ngày & giờ khám trước để hệ thống hiển thị phòng còn trống" : undefined}
        >
          {!date || !startTime ? (
            <ComboboxField options={[]} disabled placeholder="Chọn ngày & giờ trước" />
          ) : rooms === null ? (
            <ComboboxField options={[]} disabled placeholder="Đang tìm phòng trống…" />
          ) : rooms.length === 0 ? (
            <ComboboxField options={[]} disabled placeholder="Không còn phòng trống vào khung giờ này" />
          ) : (
            <ComboboxFieldRHF
              control={control}
              name="roomId"
              rules={{ required: "Vui lòng chọn phòng khám" }}
              options={rooms.map((r) => ({ value: r.id, label: `${r.name} · ${r.floor}` }))}
              placeholder="Tìm phòng còn trống…"
            />
          )}
        </FormRow>
        <FormRow label="Lý do khám">
          <Textarea rows={2} placeholder="Ghi chú lý do khám (không bắt buộc)" {...register("reason")} />
        </FormRow>
        <div className="flex justify-end gap-2.5 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit" loading={isSubmitting}>Tạo lịch hẹn</Button>
        </div>
      </form>
    </Modal>
  );
}
