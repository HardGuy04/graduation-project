import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AnimatePresence, motion } from "motion/react";
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineCheck, HiOutlineUserGroup } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import { cn } from "@/lib/utils";
import Avatar from "../../components/ui/Avatar";
import { Card, Tile, DataItem } from "../../components/app/Surface";
import { FormRow, Textarea, SearchInput } from "../../components/app/Field";
import { DateField } from "../../components/app/DateField";
import { toISODate } from "@/lib/date";
import { Empty, Loading, SkeletonList } from "../../components/app/Feedback";
import { PageHeader } from "../../components/app/PageHeader";
import { commonService } from "../../services/commonService";
import { patientService } from "../../services/patientService";
import { useAuth } from "../../context/AuthContext";
import { formatDateLong } from "../../utils/formatters";

const STEPS = ["Chuyên khoa", "Bác sĩ", "Thời gian", "Xác nhận"];

const localIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function nextDays(n) {
  const out = [];
  const base = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push({
      iso: localIso(d),
      dow: i === 0 ? "Hôm nay" : d.toLocaleDateString("vi-VN", { weekday: "short" }),
      day: d.getDate(),
    });
  }
  return out;
}

export default function PatientBookAppointment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [specialties, setSpecialties] = useState(null);
  const [doctors, setDoctors] = useState(null);
  const [specialty, setSpecialty] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState(null);
  const [slot, setSlot] = useState(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const quickDays = useMemo(() => nextDays(7), []);

  useEffect(() => {
    commonService.getSpecialties().then((res) => setSpecialties(res.data));
  }, []);

  function goTo(next) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  async function pickSpecialty(s) {
    setSpecialty(s);
    setDoctor(null);
    setDoctors(null);
    goTo(1);
    const res = await commonService.getPublicDoctors({ specialtyId: s.id });
    setDoctors(res.data);
  }

  async function pickDoctor(d) {
    setDoctor(d);
    setSlot(null);
    goTo(2);
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
      navigate("/patient/visits?tab=appointments");
    } catch (err) {
      toast.error(err.message || "Không thể đặt lịch, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredSpecialties = (specialties || []).filter((s) =>
    s.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const canNext = [!!specialty, !!doctor, !!slot, true][step];

  function handleNext() {
    if (step === 0 && specialty) {
      if (doctors) goTo(1); else pickSpecialty(specialty);
    } else if (step === 1 && doctor) {
      goTo(2);
      if (!slots) loadSlots(doctor.id, date);
    } else if (step === 2 && slot) {
      goTo(3);
    } else if (step === 3) {
      confirmBooking();
    }
  }

  const summary = [specialty?.name, doctor?.fullName, slot ? `${slot.startTime} · ${formatDateLong(date)}` : null].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Đặt lịch khám" title="Đặt lịch trong 4 bước" description="Chọn chuyên khoa, bác sĩ và khung giờ phù hợp. Lịch hẹn sẽ được phòng khám xác nhận." />

      <Stepper step={step} />

      <div className="relative mt-8 min-h-[320px]">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.section
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -32 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            aria-labelledby={`step-title-${step}`}
          >
            {step === 0 && (
              <>
                <StepTitle id="step-title-0" title="Chọn chuyên khoa" />
                <SearchInput
                  label="Tìm chuyên khoa"
                  placeholder="Tìm chuyên khoa…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="mb-5 max-w-sm"
                />
                {specialties === null ? (
                  <SkeletonList rows={4} className="sm:grid-cols-2" />
                ) : filteredSpecialties.length === 0 ? (
                  <Empty title="Không tìm thấy chuyên khoa phù hợp" />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filteredSpecialties.map((s) => (
                      <ChoiceCard key={s.id} selected={specialty?.id === s.id} onClick={() => pickSpecialty(s)}>
                        <span className="block font-semibold">{s.name}</span>
                        {s.description && <span className="mt-1 block text-sm font-normal text-muted-foreground line-clamp-2">{s.description}</span>}
                        <span className="mt-auto pt-3">
                          <span className="inline-flex rounded-full bg-tile px-2.5 py-1 text-xs font-semibold">{s.doctorCount} bác sĩ</span>
                        </span>
                      </ChoiceCard>
                    ))}
                  </div>
                )}
              </>
            )}

            {step === 1 && (
              <>
                <StepTitle id="step-title-1" title="Chọn bác sĩ" subtitle={specialty?.name} />
                {doctors === null ? (
                  <SkeletonList rows={4} className="sm:grid-cols-2" />
                ) : doctors.length === 0 ? (
                  <Empty icon={HiOutlineUserGroup} title="Chưa có bác sĩ nào thuộc chuyên khoa này" />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {doctors.map((d) => (
                      <ChoiceCard key={d.id} selected={doctor?.id === d.id} onClick={() => pickDoctor(d)}>
                        <span className="flex items-center gap-3.5">
                          <Avatar name={d.fullName} src={d.avatarUrl} color="#4E635A" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{d.fullName}</span>
                            <span className="block text-sm font-normal text-muted-foreground">{d.degree} · {d.experienceYears} năm kinh nghiệm</span>
                          </span>
                        </span>
                        {d.bio && (
                          <span className="mt-3 line-clamp-3 text-sm text-muted-foreground" title={d.bio}>{d.bio}</span>
                        )}
                      </ChoiceCard>
                    ))}
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <StepTitle id="step-title-2" title="Chọn ngày & giờ khám" subtitle={doctor?.fullName} />
                <Card className="space-y-6">
                  <div>
                    <p className="mb-2 text-sm font-semibold">Ngày khám</p>
                    <div className="-mx-1 flex gap-2 overflow-x-auto scrollbar-none px-1 pb-1" role="group" aria-label="Chọn nhanh ngày">
                      {quickDays.map((d) => (
                        <Button
                          key={d.iso}
                          variant={date === d.iso ? "default" : "outline"}
                          aria-pressed={date === d.iso}
                          onClick={() => onDateChange(d.iso)}
                          className="h-auto min-w-[64px] flex-col gap-0.5 rounded-tile px-3 py-2.5 [&>span]:flex-col [&>span]:gap-0.5"
                        >
                          <span className="text-[11px] font-medium capitalize opacity-80">{d.dow}</span>
                          <span className="text-lg font-bold leading-none tabular-nums">{d.day}</span>
                        </Button>
                      ))}
                    </div>
                    <FormRow label="Hoặc chọn ngày khác" className="mt-4 max-w-xs">
                      <DateField value={date} onChange={onDateChange} min={toISODate(new Date())} placeholder="Chọn ngày khám" />
                    </FormRow>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold">Khung giờ trống <span className="font-normal text-muted-foreground">· {formatDateLong(date)}</span></p>
                    {slots === null ? (
                      <Loading label="Đang tìm khung giờ trống…" className="py-8" />
                    ) : slots.onLeave ? (
                      <p className="rounded-field bg-destructive-soft px-4 py-3 text-sm font-medium text-destructive">
                        Bác sĩ nghỉ vào ngày này{slots.leaveReason ? ` (${slots.leaveReason})` : ""}. Vui lòng chọn ngày khác.
                      </p>
                    ) : slots.availableSlots.length === 0 ? (
                      <p className="rounded-field bg-tile px-4 py-3 text-sm text-muted-foreground">
                        Bác sĩ không có lịch làm việc hoặc đã kín lịch vào ngày này. Vui lòng chọn ngày khác.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="group" aria-label="Khung giờ">
                        {slots.availableSlots.map((s) => (
                          <Button
                            key={s.startTime}
                            variant={slot?.startTime === s.startTime ? "default" : "outline"}
                            aria-pressed={slot?.startTime === s.startTime}
                            onClick={() => setSlot(s)}
                            className="tabular-nums"
                          >
                            {s.startTime}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}

            {step === 3 && doctor && slot && (
              <>
                <StepTitle id="step-title-3" title="Xác nhận thông tin" />
                <Card className="space-y-5">
                  <div className="flex items-center gap-3.5">
                    <Avatar name={doctor.fullName} src={doctor.avatarUrl} color="#4E635A" size="lg" />
                    <div>
                      <p className="text-title">{doctor.fullName}</p>
                      <p className="text-sm text-muted-foreground">{specialty.name}</p>
                    </div>
                  </div>
                  <Tile>
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <DataItem label="Ngày khám">{formatDateLong(date)}</DataItem>
                      <DataItem label="Giờ khám"><span className="tabular-nums">{slot.startTime} – {slot.endTime}</span></DataItem>
                    </dl>
                  </Tile>
                  <FormRow label="Lý do khám / triệu chứng" hint="Giúp bác sĩ chuẩn bị tốt hơn trước buổi khám">
                    <Textarea rows={3} placeholder="VD: Đau đầu, sốt nhẹ 2 ngày…" value={reason} onChange={(e) => setReason(e.target.value)} />
                  </FormRow>
                </Card>
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-4 z-30 mr-[68px] mt-8 lg:mr-0">
        <div className="flex items-center gap-3 rounded-full border border-border bg-card/95 p-2 pl-3 shadow-float backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => goTo(step - 1)} disabled={step === 0} aria-label="Quay lại bước trước">
            <HiOutlineArrowLeft />
          </Button>
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground" aria-live="polite">
            {summary.length ? summary.join(" · ") : "Chưa chọn thông tin"}
          </p>
          <Button onClick={handleNext} disabled={!canNext} loading={step === 3 && submitting}>
            {step === 3 ? <><HiOutlineCheck /> Xác nhận đặt lịch</> : <>Tiếp tục <HiOutlineArrowRight /></>}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepTitle({ id, title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 id={id} className="text-headline">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function ChoiceCard({ selected, onClick, children }) {
  return (
    <Button
      variant="inverted"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "h-full min-h-[112px] w-full items-stretch justify-start whitespace-normal rounded-tile border p-5 text-left font-normal shadow-none",
        "[&>span]:flex [&>span]:w-full [&>span]:flex-col [&>span]:items-start [&>span]:justify-start [&>span]:gap-0",
        selected ? "border-accent bg-accent-soft ring-1 ring-accent" : "border-border hover:border-accent/50 hover:bg-card"
      )}
    >
      {children}
    </Button>
  );
}

function Stepper({ step }) {
  return (
    <nav aria-label="Tiến trình đặt lịch">
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <li key={label} aria-current={state === "current" ? "step" : undefined} className="min-w-0">
              <div className="h-1 overflow-hidden rounded-full bg-tile">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: state === "todo" ? "0%" : "100%" }}
                  transition={{ type: "spring", stiffness: 200, damping: 30 }}
                />
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    state === "todo" ? "bg-tile text-muted-foreground" : "bg-primary text-primary-foreground"
                  )}
                >
                  {state === "done" ? <HiOutlineCheck aria-hidden className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn("hidden truncate text-sm font-semibold sm:block", state === "todo" ? "text-muted-foreground" : "text-foreground")}>
                  {label}
                </span>
                <span className="sr-only">{state === "done" ? "(đã xong)" : state === "current" ? "(bước hiện tại)" : ""}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm font-semibold sm:hidden">
        Bước {step + 1}/{STEPS.length}: {STEPS[step]}
      </p>
    </nav>
  );
}
