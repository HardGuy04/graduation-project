import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import clsx from "clsx";
import { HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineUserGroup } from "react-icons/hi";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Avatar from "../../components/ui/Avatar";
import { FormRow, Input, Textarea } from "../../components/ui/Field";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import { commonService } from "../../services/commonService";
import { patientService } from "../../services/patientService";
import { useAuth } from "../../context/AuthContext";
import { formatDateLong } from "../../utils/formatters";

const STEPS = ["Chuyên khoa", "Bác sĩ", "Thời gian", "Xác nhận"];

export default function PatientBookAppointment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [specialties, setSpecialties] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [specialty, setSpecialty] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState(null);
  const [slot, setSlot] = useState(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    commonService.getSpecialties().then((res) => setSpecialties(res.data));
  }, []);

  async function pickSpecialty(s) {
    setSpecialty(s);
    setDoctor(null);
    const res = await commonService.getPublicDoctors({ specialtyId: s.id });
    setDoctors(res.data);
    setStep(1);
  }

  async function pickDoctor(d) {
    setDoctor(d);
    setStep(2);
    loadSlots(d.id, date);
  }

  async function loadSlots(doctorId, forDate) {
    setSlots(null);
    const res = await patientService.getDoctorSlots(doctorId, forDate);
    setSlots(res.data);
  }

  function onDateChange(v) {
    setDate(v);
    setSlot(null);
    if (doctor) loadSlots(doctor.id, v);
  }

  async function confirmBooking() {
    setSubmitting(true);
    try {
      await patientService.bookAppointment(user.id, {
        doctorId: doctor.id, appointmentDate: date, startTime: slot.startTime, endTime: slot.endTime, reason,
      });
      toast.success("Đặt lịch khám thành công! Vui lòng chờ xác nhận.");
      navigate("/patient/appointments");
    } catch (err) {
      toast.error(err.message || "Không thể đặt lịch, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <Stepper step={step} />

      {step === 0 && (
        <div>
          <h3 className="text-lg font-bold text-ink mb-4">Chọn chuyên khoa</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {specialties.map((s) => (
              <button key={s.id} onClick={() => pickSpecialty(s)} className="text-left">
                <Card className="h-full hover:border-teal-300 hover:shadow-card transition">
                  <p className="font-bold text-ink">{s.name}</p>
                  <p className="text-sm text-ink-faint mt-1">{s.description}</p>
                  <p className="text-xs text-teal-600 font-semibold mt-3">{s.doctorCount} bác sĩ</p>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <BackLink onClick={() => setStep(0)} label="Đổi chuyên khoa" />
          <h3 className="text-lg font-bold text-ink my-4">Chọn bác sĩ — {specialty?.name}</h3>
          {doctors.length === 0 ? (
            <EmptyState icon={HiOutlineUserGroup} title="Chưa có bác sĩ nào thuộc chuyên khoa này" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {doctors.map((d) => (
                <button key={d.id} onClick={() => pickDoctor(d)} className="text-left">
                  <Card className="flex items-center gap-3.5 h-full hover:border-teal-300 hover:shadow-card transition">
                    <Avatar name={d.fullName} color={d.avatarColor} src={d.avatarUrl} />
                    <div>
                      <p className="font-bold text-ink">{d.fullName}</p>
                      <p className="text-sm text-ink-faint">{d.degree} · {d.experienceYears} năm kinh nghiệm</p>
                    </div>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          <BackLink onClick={() => setStep(1)} label="Đổi bác sĩ" />
          <h3 className="text-lg font-bold text-ink my-4">Chọn ngày & giờ khám — {doctor?.fullName}</h3>
          <Card>
            <FormRow label="Chọn ngày khám">
              <Input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => onDateChange(e.target.value)} />
            </FormRow>
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink mb-2">Khung giờ trống</p>
              {slots === null ? (
                <Spinner />
              ) : slots.onLeave ? (
                <p className="text-sm text-clay-500 font-medium py-4">Bác sĩ nghỉ vào ngày này{slots.leaveReason ? ` (${slots.leaveReason})` : ""}. Vui lòng chọn ngày khác.</p>
              ) : slots.availableSlots.length === 0 ? (
                <p className="text-sm text-ink-faint py-4">Bác sĩ không có lịch làm việc hoặc đã kín lịch vào ngày này. Vui lòng chọn ngày khác.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.availableSlots.map((s) => (
                    <button
                      key={s.startTime}
                      onClick={() => setSlot(s)}
                      className={clsx(
                        "rounded-lg border px-3.5 py-2 text-sm font-semibold transition",
                        slot?.startTime === s.startTime ? "border-teal-500 bg-teal-500 text-white" : "border-slate-200 text-ink-soft hover:border-teal-300"
                      )}
                    >
                      {s.startTime}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <Button disabled={!slot} onClick={() => setStep(3)}>Tiếp tục</Button>
            </div>
          </Card>
        </div>
      )}

      {step === 3 && (
        <div>
          <BackLink onClick={() => setStep(2)} label="Đổi thời gian" />
          <h3 className="text-lg font-bold text-ink my-4">Xác nhận thông tin đặt lịch</h3>
          <Card className="space-y-4">
            <div className="flex items-center gap-3.5">
              <Avatar name={doctor.fullName} color={doctor.avatarColor} src={doctor.avatarUrl} />
              <div>
                <p className="font-bold text-ink">{doctor.fullName}</p>
                <p className="text-sm text-ink-faint">{specialty.name}</p>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 grid sm:grid-cols-2 gap-3 text-sm">
              <div><p className="text-ink-faint">Ngày khám</p><p className="font-semibold text-ink">{formatDateLong(date)}</p></div>
              <div><p className="text-ink-faint">Giờ khám</p><p className="font-semibold text-ink">{slot.startTime} – {slot.endTime}</p></div>
            </div>
            <FormRow label="Lý do khám / triệu chứng" hint="Giúp bác sĩ chuẩn bị tốt hơn trước buổi khám">
              <Textarea rows={3} placeholder="VD: Đau đầu, sốt nhẹ 2 ngày…" value={reason} onChange={(e) => setReason(e.target.value)} />
            </FormRow>
            <Button className="w-full" size="lg" onClick={confirmBooking} loading={submitting}>
              <HiOutlineCheckCircle className="h-5 w-5" /> Xác nhận đặt lịch
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

function BackLink({ onClick, label }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-teal-600">
      <HiOutlineArrowLeft className="h-4 w-4" /> {label}
    </button>
  );
}

function Stepper({ step }) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2.5">
            <div
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0",
                i < step ? "bg-teal-500 text-white" : i === step ? "bg-teal-100 text-teal-700 ring-2 ring-teal-500" : "bg-slate-100 text-slate-400"
              )}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className={clsx("text-sm font-semibold hidden sm:block", i <= step ? "text-ink" : "text-slate-400")}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={clsx("h-0.5 flex-1 mx-3", i < step ? "bg-teal-500" : "bg-slate-100")} />}
        </div>
      ))}
    </div>
  );
}
