import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "react-toastify";
import { AnimatePresence, motion } from "motion/react";
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlinePlay,
  HiOutlineSparkles,
  HiOutlinePhone,
  HiOutlineLocationMarker,
} from "react-icons/hi";

import { Button } from "@/components/kit/button";
import { cn } from "@/lib/utils";
import Avatar from "../../components/ui/Avatar";
import { Card, CardHeader, Tile } from "../../components/app/Surface";
import { AppointmentBadge } from "../../components/app/Badge";
import { FormRow, Input, Textarea } from "../../components/app/Field";
import { DateFieldRHF } from "../../components/app/DateField";
import { toISODate } from "@/lib/date";
import { Empty, Loading } from "../../components/app/Feedback";
import { doctorService } from "../../services/doctorService";
import { aiService } from "../../services/aiService";
import { useAuth } from "../../context/AuthContext";
import { formatDate, formatDateLong } from "../../utils/formatters";

export default function DoctorAppointmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [appt, setAppt] = useState(null);
  const [startingVisit, setStartingVisit] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await doctorService.getAppointmentDetail(id);
      setAppt(res.data);
    } catch (error) {
      toast.error(error?.message || "Không thể tải thông tin lịch hẹn.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateStatus(status) {
    try {
      setStartingVisit(true);
      await doctorService.updateAppointmentStatus(id, status);
      toast.success("Cập nhật trạng thái thành công.");
      load();
    } catch (error) {
      toast.error(error?.message || "Không thể cập nhật trạng thái lịch hẹn.");
    } finally {
      setStartingVisit(false);
    }
  }

  if (loading) return <Loading label="Đang tải thông tin lịch hẹn…" />;
  if (!appt) return <Empty title="Không tìm thấy lịch hẹn" />;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link to="/doctor/appointments"><HiOutlineArrowLeft /> Danh sách lịch hẹn</Link>
      </Button>

      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={appt.patientName} color="#4E635A" size="lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-headline">{appt.patientName}</h1>
            <AppointmentBadge status={appt.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="capitalize">{formatDateLong(appt.date)} · {appt.startTime}</span>
            {appt.patientPhone && (
              <span className="inline-flex items-center gap-1"><HiOutlinePhone aria-hidden className="h-4 w-4" /> {appt.patientPhone}</span>
            )}
            {appt.roomName && (
              <span className="inline-flex items-center gap-1"><HiOutlineLocationMarker aria-hidden className="h-4 w-4" /> {appt.roomName}</span>
            )}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-semibold">Lý do khám:</span> {appt.reason || "—"}
          </p>
        </div>

        {appt.status === "confirmed" && (
          <Button onClick={() => updateStatus("in_progress")} loading={startingVisit} className="shrink-0">
            <HiOutlinePlay /> Bắt đầu khám
          </Button>
        )}
      </Card>

      {appt.status === "completed" && appt.record ? (
        <RecordSummary record={appt.record} prescription={appt.prescription} />
      ) : appt.status === "in_progress" ? (
        <MedicalRecordForm
          doctorId={user.id}
          appointmentId={appt.id}
          appointmentReason={appt.reason}
          onDone={() => {
            load();
          }}
        />
      ) : (
        <Empty
          title="Chưa thể ghi hồ sơ khám bệnh"
          description='Lịch hẹn cần ở trạng thái "Đang khám" để bác sĩ nhập triệu chứng, chẩn đoán và kê đơn thuốc.'
        />
      )}
    </div>
  );
}

/** Hiển thị hồ sơ khám và đơn thuốc sau khi hoàn tất. */
function RecordSummary({ record, prescription }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Hồ sơ khám bệnh" description={formatDate(record.createdAt)} />
        <dl className="space-y-4 text-sm">
          <SummaryRow label="Triệu chứng">{record.symptoms}</SummaryRow>
          <SummaryRow label="Chẩn đoán">
            {record.diagnosis || <span className="italic">Chưa xác định</span>}
          </SummaryRow>
          <SummaryRow label="Ghi chú điều trị">{record.notes || "—"}</SummaryRow>
          <SummaryRow label="Ngày tái khám">
            {record.followUpDate ? formatDate(record.followUpDate) : "Không hẹn tái khám"}
          </SummaryRow>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Đơn thuốc" />
        {!prescription ? (
          <p className="text-sm text-muted-foreground">Chưa kê đơn thuốc cho lần khám này.</p>
        ) : (
          <ul className="divide-y divide-border">
            {prescription.details.map((detail, index) => (
              <li key={`${detail.medicineName}-${index}`} className="flex justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold">{detail.medicineName}</p>
                  <p className="text-xs text-muted-foreground">{detail.dosage} · {detail.instruction || "—"}</p>
                </div>
                <span className="shrink-0 rounded-full bg-tile px-2.5 py-1 text-xs font-semibold tabular-nums">SL {detail.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SummaryRow({ label, children }) {
  return (
    <div>
      <dt className="font-semibold">{label}</dt>
      <dd className="mt-0.5 text-muted-foreground">{children}</dd>
    </div>
  );
}

/** Form nhập hồ sơ khám và kê đơn thuốc. */
function MedicalRecordForm({ doctorId, appointmentId, appointmentReason, onDone }) {
  const {
    register: registerRecord,
    control: controlRecord,
    handleSubmit: handleSubmitRecord,
    getValues,
    setValue: setRecordValue,
    formState: { errors: recordErrors, isSubmitting: savingRecord },
  } = useForm({
    // Điền sẵn triệu chứng từ "Lý do khám" bệnh nhân đã nhập lúc đặt lịch
    defaultValues: { symptoms: appointmentReason || "" },
  });

  const {
    register: registerRx,
    control,
    handleSubmit: handleSubmitRx,
    formState: { isSubmitting: savingRx },
  } = useForm({
    defaultValues: {
      details: [{ medicineName: "", dosage: "", quantity: 1, instruction: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "details" });

  const [recordId, setRecordId] = useState(null);
  const [savedRecord, setSavedRecord] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Cho phép bác sĩ chọn NHIỀU bệnh gợi ý cùng lúc (hỗ trợ chẩn đoán bệnh kép/đa bệnh)
  const [selectedDiseases, setSelectedDiseases] = useState([]);

  function toggleDisease(name) {
    setSelectedDiseases((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  function applyDiagnosis() {
    setRecordValue("diagnosis", selectedDiseases.join(", "), { shouldValidate: true, shouldDirty: true });
    toast.success(
      selectedDiseases.length > 1
        ? `Đã áp dụng ${selectedDiseases.length} bệnh vào ô chẩn đoán`
        : "Đã áp dụng vào ô chẩn đoán"
    );
  }

  /** Gọi qua lớp aiService — khi có AI_SERVICE thật chỉ cần sửa src/services/aiService.js. */
  async function handleAiRecommendation() {
    const values = getValues();
    if (!values.symptoms?.trim() && !values.diagnosis?.trim()) {
      toast.warning("Vui lòng nhập triệu chứng hoặc chẩn đoán trước.");
      return;
    }
    try {
      setAiLoading(true);
      const res = await aiService.predictDiseaseAndMedicine({ symptoms: values.symptoms, diagnosis: values.diagnosis });
      setAiResult(res.data);
      setSelectedDiseases([]);
    } catch (error) {
      toast.error(error?.message || "Không thể lấy kết quả gợi ý từ AI.");
    } finally {
      setAiLoading(false);
    }
  }

  async function onSubmitRecord(values) {
    try {
      const res = await doctorService.createMedicalRecord(doctorId, { ...values, appointmentId });
      setRecordId(res.data.id);
      setSavedRecord(res.data);
      toast.success("Lưu hồ sơ khám bệnh thành công. Tiếp tục kê đơn thuốc bên dưới.");
    } catch (error) {
      toast.error(error?.message || "Không thể lưu hồ sơ khám bệnh.");
    }
  }

  async function onSubmitRx(values) {
    if (!recordId) {
      toast.error("Chưa có hồ sơ khám bệnh.");
      return;
    }
    const validDetails = values.details.filter(
      (detail) => detail.medicineName?.trim() && detail.dosage?.trim() && Number(detail.quantity) > 0
    );
    if (validDetails.length === 0) {
      toast.warning("Vui lòng nhập ít nhất một thuốc hợp lệ.");
      return;
    }
    try {
      await doctorService.createPrescription({ medicalRecordId: recordId, details: validDetails });
      toast.success("Kê đơn thuốc thành công. Hoàn tất lượt khám!");
      onDone();
    } catch (error) {
      toast.error(error?.message || "Không thể lưu đơn thuốc.");
    }
  }

  const phase = savedRecord ? 1 : 0;

  return (
    <div className="space-y-4">
      <ol className="flex items-center gap-3 text-sm" aria-label="Các bước ghi hồ sơ">
        {["Hồ sơ khám", "Kê đơn thuốc"].map((label, i) => (
          <li key={label} aria-current={phase === i ? "step" : undefined} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                i <= phase ? "bg-primary text-primary-foreground" : "bg-tile text-muted-foreground"
              )}
            >
              {i < phase ? <HiOutlineCheck aria-hidden className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn("font-semibold", i > phase && "text-muted-foreground")}>{label}</span>
            {i === 0 && <span aria-hidden className="mx-1 h-px w-8 bg-input" />}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        {savedRecord ? (
          <motion.div key="rx" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            <Card>
              <CardHeader title="Kê đơn thuốc" description={`Chẩn đoán: ${savedRecord.diagnosis || "Chưa xác định"}`} />

              <form onSubmit={handleSubmitRx(onSubmitRx)} className="space-y-3">
                <div className="hidden grid-cols-12 gap-2 px-3 text-xs font-semibold text-muted-foreground sm:grid">
                  <span className="col-span-4">Tên thuốc</span>
                  <span className="col-span-3">Liều dùng</span>
                  <span className="col-span-2">Số lượng</span>
                  <span className="col-span-2">Cách dùng</span>
                </div>
                {fields.map((field, index) => (
                  <Tile key={field.id} className="grid grid-cols-12 items-start gap-2 p-3">
                    <div className="col-span-12 sm:col-span-4">
                      <Input aria-label={`Tên thuốc dòng ${index + 1}`} placeholder="Tên thuốc" {...registerRx(`details.${index}.medicineName`, { required: true })} />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <Input aria-label={`Liều dùng dòng ${index + 1}`} placeholder="Liều dùng" {...registerRx(`details.${index}.dosage`, { required: true })} />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <Input
                        aria-label={`Số lượng dòng ${index + 1}`}
                        type="number"
                        min={1}
                        placeholder="SL"
                        {...registerRx(`details.${index}.quantity`, { required: true, valueAsNumber: true, min: 1 })}
                      />
                    </div>
                    <div className="col-span-9 sm:col-span-2">
                      <Input aria-label={`Cách dùng dòng ${index + 1}`} placeholder="Cách dùng" {...registerRx(`details.${index}.instruction`)} />
                    </div>
                    <div className="col-span-3 flex justify-end sm:col-span-1">
                      <Button
                        variant="ghost-danger"
                        size="icon"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                        aria-label={fields.length === 1 ? "Phải có ít nhất một dòng thuốc" : `Xóa thuốc dòng ${index + 1}`}
                        title={fields.length === 1 ? "Phải có ít nhất một dòng thuốc" : "Xóa thuốc"}
                      >
                        <HiOutlineTrash />
                      </Button>
                    </div>
                  </Tile>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => append({ medicineName: "", dosage: "", quantity: 1, instruction: "" })}
                >
                  <HiOutlinePlus /> Thêm thuốc
                </Button>

                <div className="flex justify-end pt-2">
                  <Button type="submit" loading={savingRx}>
                    <HiOutlineCheck /> Hoàn tất lượt khám
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="record" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            <Card>
              <CardHeader title="Ghi hồ sơ khám bệnh" description="Nhập thông tin thăm khám cho bệnh nhân" />

              <form onSubmit={handleSubmitRecord(onSubmitRecord)} className="space-y-4">
                <FormRow
                  label="Triệu chứng"
                  required
                  error={recordErrors.symptoms?.message}
                  hint={appointmentReason ? "Đã tự điền từ lý do khám bệnh nhân đã nhập lúc đặt lịch — bạn có thể chỉnh sửa lại." : undefined}
                >
                  <Textarea rows={2} placeholder="Mô tả triệu chứng bệnh nhân gặp phải" {...registerRecord("symptoms", { required: "Bắt buộc" })} />
                </FormRow>

                <FormRow
                  label="Chẩn đoán"
                  hint="Không bắt buộc — có thể để trống nếu cần chờ kết quả xét nghiệm; hỗ trợ nhập nhiều bệnh (bệnh kép), phân tách bằng dấu phẩy"
                >
                  <Input placeholder="VD: Viêm họng, Viêm dạ dày (để trống nếu chưa xác định)" {...registerRecord("diagnosis")} />
                </FormRow>

                <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                  <FormRow label="Ghi chú điều trị">
                    <Textarea rows={2} placeholder="Lời khuyên, hướng dẫn chăm sóc…" {...registerRecord("notes")} />
                  </FormRow>
                  <FormRow label="Ngày hẹn tái khám" hint="Bỏ trống nếu không cần tái khám">
                    <DateFieldRHF control={controlRecord} name="followUpDate" min={toISODate(new Date())} placeholder="Chọn ngày tái khám" showClearButton />
                  </FormRow>
                </div>

                <section aria-labelledby="ai-title" className="space-y-4 rounded-tile border border-border bg-background p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <HiOutlineSparkles aria-hidden className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 id="ai-title" className="font-semibold">Trợ lý AI hỗ trợ bác sĩ</h3>
                        <p className="mt-0.5 text-sm text-muted-foreground">Gợi ý bệnh và thuốc theo xác suất từ 1% đến 100%.</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" loading={aiLoading} onClick={handleAiRecommendation}>
                      Gợi ý bệnh và thuốc
                    </Button>
                  </div>

                  {aiResult && (
                    <AiRecommendationResult
                      result={aiResult}
                      selectedDiseases={selectedDiseases}
                      onToggleDisease={toggleDisease}
                      onApplyDiagnosis={applyDiagnosis}
                      onUseMedicine={(medicine) => {
                        append({ medicineName: medicine.name, dosage: "", quantity: 1, instruction: "" });
                        toast.success(`Đã thêm ${medicine.name} vào đơn thuốc mẫu.`);
                      }}
                    />
                  )}
                </section>

                <div className="flex justify-end pt-2">
                  <Button type="submit" loading={savingRecord}>Lưu & tiếp tục kê đơn</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProbabilityBar({ value }) {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-tile" role="presentation">
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 24 }}
      />
    </div>
  );
}

/** Hiển thị danh sách gợi ý bệnh và thuốc từ AI. */
function AiRecommendationResult({ result, selectedDiseases, onToggleDisease, onApplyDiagnosis, onUseMedicine }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-tile border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold">Gợi ý bệnh</h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Có thể chọn nhiều bệnh nếu nghi ngờ bệnh nhân mắc đồng thời (bệnh kép)</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">Xác suất</span>
        </div>

        <fieldset className="space-y-2">
          <legend className="sr-only">Chọn bệnh gợi ý</legend>
          {result.diseases.map((disease, index) => {
            const checked = selectedDiseases.includes(disease.name);
            return (
              <label
                key={`${disease.name}-${index}`}
                className={cn(
                  "block cursor-pointer rounded-field border p-3 transition-colors",
                  checked ? "border-primary bg-tile" : "border-transparent hover:bg-tile"
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleDisease(disease.name)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-input accent-black"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{index + 1}. {disease.name}</p>
                      <span className="shrink-0 text-sm font-bold tabular-nums">{disease.probability}%</span>
                    </div>
                    <ProbabilityBar value={disease.probability} />
                    <p className="mt-1.5 text-xs text-muted-foreground">{disease.description}</p>
                  </div>
                </div>
              </label>
            );
          })}
        </fieldset>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {selectedDiseases.length > 0 ? `Đã chọn ${selectedDiseases.length} bệnh` : "Chưa chọn bệnh nào"}
          </p>
          <Button size="sm" disabled={selectedDiseases.length === 0} onClick={onApplyDiagnosis}>
            Áp dụng vào chẩn đoán
          </Button>
        </div>
      </div>

      <div className="rounded-tile border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="font-semibold">Gợi ý thuốc</h4>
          <span className="text-xs text-muted-foreground">Xác suất</span>
        </div>

        <ul className="space-y-4">
          {result.medicines.map((medicine, index) => (
            <li key={`${medicine.name}-${index}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{index + 1}. {medicine.name}</p>
                <span className="shrink-0 text-sm font-bold tabular-nums">{medicine.probability}%</span>
              </div>
              <ProbabilityBar value={medicine.probability} />
              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">{medicine.usage}</p>
                <Button variant="ghost" size="sm" className="self-start px-3 text-xs sm:self-auto" onClick={() => onUseMedicine(medicine)}>
                  <HiOutlinePlus /> Thêm vào đơn
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
