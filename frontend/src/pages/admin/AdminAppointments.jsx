import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { HiOutlineSearch, HiOutlinePlus, HiOutlineCheck, HiOutlineX, HiOutlineBan } from "react-icons/hi";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Tabs from "../../components/ui/Tabs";
import { AppointmentStatusBadge } from "../../components/ui/StatusBadge";
import { TableShell, Th, Td, Tr } from "../../components/ui/Table";
import { FormRow, Input, Select, Textarea } from "../../components/ui/Field";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { adminService } from "../../services/adminService";
import { commonService } from "../../services/commonService";
import { formatDate } from "../../utils/formatters";

const STATUS_TABS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "rejected", label: "Từ chối" },
];

export default function AdminAppointments() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // {type, appt}

  async function load() {
    setLoading(true);
    const res = await adminService.getAppointments({ status: status || undefined, q: q || undefined });
    setList(res.data);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [status, q]); // eslint-disable-line

  async function runAction() {
    const { type, appt } = confirmAction;
    const fn = { confirm: adminService.confirmAppointment, reject: adminService.rejectAppointment, cancel: adminService.cancelAppointment }[type];
    await fn(appt.id);
    toast.success("Cập nhật lịch hẹn thành công");
    setConfirmAction(null);
    load();
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Tabs tabs={STATUS_TABS} active={status} onChange={setStatus} />
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-xs">
            <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            <Input placeholder="Tìm theo tên/SĐT bệnh nhân…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button onClick={() => setModalOpen(true)}><HiOutlinePlus className="h-4 w-4" /> Tạo lịch hẹn</Button>
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
              <Th>Bệnh nhân</Th><Th>Bác sĩ</Th><Th>Ngày khám</Th><Th>Giờ</Th><Th>Phòng khám</Th><Th>Lý do khám</Th><Th>Trạng thái</Th><Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <Tr key={a.id}>
                <Td className="font-semibold">{a.patientName}</Td>
                <Td>{a.doctorName}<br /><span className="text-xs text-ink-faint">{a.doctorSpecialty}</span></Td>
                <Td>{formatDate(a.date)}</Td>
                <Td>{a.startTime}</Td>
                <Td>
                  {a.roomName ? (
                    <span className="text-sm font-medium text-ink-soft">{a.roomName}</span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Chưa xếp phòng</span>
                  )}
                </Td>
                <Td className="max-w-[220px] truncate" title={a.reason}>{a.reason}</Td>
                <Td><AppointmentStatusBadge status={a.status} /></Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    {a.status === "pending" && (
                      <>
                        <button onClick={() => setConfirmAction({ type: "confirm", appt: a })} className="p-2 rounded-lg text-leaf-600 hover:bg-leaf-50" title="Xác nhận">
                          <HiOutlineCheck className="h-4 w-4" />
                        </button>
                        <button onClick={() => setConfirmAction({ type: "reject", appt: a })} className="p-2 rounded-lg text-clay-500 hover:bg-clay-50" title="Từ chối">
                          <HiOutlineX className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {["pending", "confirmed"].includes(a.status) && (
                      <button onClick={() => setConfirmAction({ type: "cancel", appt: a })} className="p-2 rounded-lg text-ink-faint hover:bg-slate-100" title="Hủy lịch">
                        <HiOutlineBan className="h-4 w-4" />
                      </button>
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
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm();
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
        <FormRow label="Bệnh nhân" required error={errors.patientId?.message}>
          <Select {...register("patientId", { required: true })}>
            <option value="">— Chọn bệnh nhân —</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} · {p.phone}</option>)}
          </Select>
        </FormRow>
        <FormRow label="Bác sĩ" required error={errors.doctorId?.message}>
          <Select {...register("doctorId", { required: true })}>
            <option value="">— Chọn bác sĩ —</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.fullName} · {d.specialtyName}</option>)}
          </Select>
        </FormRow>
        <div className="grid grid-cols-2 gap-3">
          <FormRow label="Ngày khám" required><Input type="date" {...register("date", { required: true })} /></FormRow>
          <FormRow label="Giờ khám" required><Input type="time" {...register("startTime", { required: true })} /></FormRow>
        </div>
        <FormRow
          label="Phòng khám"
          required
          error={errors.roomId?.message}
          hint={!date || !startTime ? "Chọn ngày & giờ khám trước để hệ thống hiển thị phòng còn trống" : undefined}
        >
          {!date || !startTime ? (
            <Select disabled><option>— Chọn ngày & giờ trước —</option></Select>
          ) : rooms === null ? (
            <Select disabled><option>Đang tìm phòng trống…</option></Select>
          ) : rooms.length === 0 ? (
            <Select disabled><option>Không còn phòng trống vào khung giờ này</option></Select>
          ) : (
            <Select {...register("roomId", { required: "Vui lòng chọn phòng khám" })}>
              <option value="">— Chọn phòng còn trống —</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.floor}</option>)}
            </Select>
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
