import { useEffect, useMemo, useState } from "react";
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
  HiOutlineExclamationCircle,
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
    watch: watchRecord,
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

  function applyDiagnosis(diseasesToApply) {
    const toApply = Array.isArray(diseasesToApply) ? diseasesToApply : selectedDiseases;
    if (!toApply || toApply.length === 0) return;
    setRecordValue("diagnosis", toApply.join(", "), { shouldValidate: true, shouldDirty: true });
    setSelectedDiseases(toApply);
    toast.success(
      toApply.length > 1
        ? `Đã áp dụng ${toApply.length} bệnh vào ô chẩn đoán`
        : `Đã áp dụng bệnh "${toApply[0]}" vào ô chẩn đoán`
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

      // Tự chọn bệnh khớp với chẩn đoán hiện tại, không có thì chọn bệnh xác suất cao nhất
      const diseases = res.data?.diseases || [];
      const currentDiag = (values.diagnosis || "").trim();
      if (currentDiag && diseases.length > 0) {
        const matched = diseases.filter(
          (d) =>
            normalizeText(currentDiag).includes(normalizeText(d.name)) ||
            normalizeText(d.name).includes(normalizeText(currentDiag))
        );
        setSelectedDiseases(matched.length > 0 ? matched.map((m) => m.name) : [diseases[0].name]);
      } else if (diseases.length > 0) {
        setSelectedDiseases([diseases[0].name]);
      } else {
        setSelectedDiseases([]);
      }
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
                    {/* Ở mobile nút xoá chiếm hết dòng để vùng bấm đủ 44px */}
                    <div className="col-span-12 flex justify-end sm:col-span-1">
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
                      currentDiagnosis={watchRecord("diagnosis")}
                      onToggleDisease={toggleDisease}
                      onSelectOnlyDisease={(name) => setSelectedDiseases([name])}
                      onApplyDiagnosis={applyDiagnosis}
                      onUseMedicine={(medicine) => {
                        const medName =
                          medicine.name +
                          (medicine.activeIngredient && medicine.activeIngredient !== medicine.name
                            ? ` (${medicine.activeIngredient})`
                            : "");
                        append({
                          medicineName: medName,
                          dosage: medicine.dosage || "",
                          quantity: 1,
                          instruction: medicine.instruction || "",
                        });
                        toast.success(`Đã thêm ${medicine.name} vào đơn thuốc mẫu.`);
                      }}
                      onApplyLifestyleToNotes={(lifestyleText) => {
                        const currentNotes = getValues("notes") || "";
                        const newNotes = currentNotes
                          ? `${currentNotes}\n\n[Lời khuyên dinh dưỡng & chăm sóc (AI)]\n${lifestyleText}`
                          : `[Lời khuyên dinh dưỡng & chăm sóc (AI)]\n${lifestyleText}`;
                        setRecordValue("notes", newNotes, { shouldDirty: true });
                        toast.success("Đã sao chép lời khuyên vào ô Ghi chú điều trị.");
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

/**
 * Chuẩn hóa chuỗi tiếng Việt để so khớp không phân biệt dấu hay hoa thường.
 */
function normalizeText(text) {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim();
}

/**
 * Kiểm tra xem thuốc có chỉ định điều trị cho bệnh nào hay không.
 */
function matchesDisease(med, diseaseName) {
  if (!med) return false;
  const target = normalizeText(diseaseName);
  if (!target) return false;

  // 1. So khớp qua danh sách bệnh được gán cho thuốc (forDiseases)
  if (Array.isArray(med.forDiseases) && med.forDiseases.length > 0) {
    const hasMatch = med.forDiseases.some((d) => {
      const dNorm = normalizeText(d);
      return dNorm === target || dNorm.includes(target) || target.includes(dNorm);
    });
    if (hasMatch) return true;
  }

  // 2. So khớp qua cột dùng (usage) hoặc ghi chú (note)
  const usageNorm = normalizeText(med.usage || "");
  const noteNorm = normalizeText(med.note || "");
  if (usageNorm.includes(target) || noteNorm.includes(target)) {
    return true;
  }

  return false;
}

/**
 * Hiển thị danh sách gợi ý bệnh và thuốc từ AI.
 * Khi đã chẩn đoán/chọn bệnh, phần gợi ý thuốc sẽ lọc chính xác các thuốc điều trị bệnh đó
 * (tra cứu phác đồ Hàng 1 / Hàng 2 từ Cơ sở tri thức của AI_SERVICE).
 */
function AiRecommendationResult({
  result,
  selectedDiseases,
  currentDiagnosis,
  onToggleDisease,
  onSelectOnlyDisease,
  onApplyDiagnosis,
  onUseMedicine,
  onApplyLifestyleToNotes,
}) {
  const [activeTab, setActiveTab] = useState("DIAGNOSED"); // "DIAGNOSED" | "ALL"
  const [protocolMeds, setProtocolMeds] = useState(null);
  const [loadingProtocol, setLoadingProtocol] = useState(false);

  // Xác định danh sách bệnh đang được chẩn đoán/lựa chọn
  const activeDiseases = useMemo(() => {
    if (selectedDiseases && selectedDiseases.length > 0) {
      return selectedDiseases;
    }
    if (currentDiagnosis && currentDiagnosis.trim()) {
      return currentDiagnosis
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (result?.diseases && result.diseases.length > 0) {
      return [result.diseases[0].name];
    }
    return [];
  }, [selectedDiseases, currentDiagnosis, result]);

  const primaryDisease = activeDiseases[0] || "";

  // Tự động tải phác đồ thuốc chi tiết từ Cơ sở tri thức (KB) cho bệnh đang được chẩn đoán
  useEffect(() => {
    let isCancelled = false;
    if (!primaryDisease) {
      setProtocolMeds(null);
      return;
    }

    async function fetchProtocol() {
      try {
        setLoadingProtocol(true);
        const data = await aiService.getMedicinesByDisease(primaryDisease);
        if (!isCancelled && data && data.found && Array.isArray(data.medicines)) {
          setProtocolMeds({ disease: primaryDisease, medicines: data.medicines, details: data.disease });
        } else if (!isCancelled) {
          setProtocolMeds(null);
        }
      } catch {
        if (!isCancelled) setProtocolMeds(null);
      } finally {
        if (!isCancelled) setLoadingProtocol(false);
      }
    }

    fetchProtocol();
    return () => {
      isCancelled = true;
    };
  }, [primaryDisease]);

  // Danh sách thuốc điều trị riêng cho bệnh đang chẩn đoán
  const medicinesForDiagnosed = useMemo(() => {
    // 1. Ưu tiên danh mục phác đồ chuẩn từ Cơ sở tri thức (có phân loại Hàng 1, Hàng 2)
    if (protocolMeds && protocolMeds.disease === primaryDisease && protocolMeds.medicines?.length > 0) {
      return protocolMeds.medicines.map((m) => {
        // Tìm xem mô hình ML có cho điểm xác suất không
        const mlMatch = (result?.medicines || []).find((x) => normalizeText(x.name) === normalizeText(m.name));
        return {
          name: m.name,
          activeIngredient: m.activeIngredient || "",
          probability: mlMatch?.probability || (m.line === 1 ? 95 : 82),
          usage: m.usage || "",
          dosage: m.dosage || "",
          instruction: m.instruction || "",
          forDiseases: [primaryDisease],
          line: m.line || 1,
          prescriptionRequired: m.prescriptionRequired !== false,
          contraindications: m.contraindications || [],
          warnings: mlMatch?.warnings || [],
        };
      });
    }

    // 2. Dự phòng: lọc từ danh sách thuốc gợi ý tổng hợp của AI
    if (!result?.medicines) return [];
    if (activeDiseases.length === 0) return result.medicines;
    return result.medicines.filter((med) => activeDiseases.some((d) => matchesDisease(med, d)));
  }, [protocolMeds, primaryDisease, result, activeDiseases]);

  const allMeds = result?.medicines || [];
  const displayedMedicines =
    activeTab === "ALL" ? allMeds : medicinesForDiagnosed.length > 0 ? medicinesForDiagnosed : allMeds;

  // Lời khuyên lối sống và dinh dưỡng cho bệnh nhân
  const lifestyle =
    result?.lifestyleAdvice ||
    (protocolMeds?.details && {
      disease: protocolMeds.details.name,
      diets: protocolMeds.details.diets || [],
      precautions: protocolMeds.details.precautions || [],
      workouts: protocolMeds.details.workouts || [],
    });

  const hasLifestyle =
    lifestyle &&
    ((lifestyle.diets && lifestyle.diets.length > 0) ||
      (lifestyle.precautions && lifestyle.precautions.length > 0) ||
      (lifestyle.workouts && lifestyle.workouts.length > 0));

  return (
    <div className="space-y-4">
      {/* Cảnh báo dấu hiệu nguy hiểm (Red Flags) nếu có */}
      {result?.redFlags && result.redFlags.length > 0 && (
        <div className="rounded-field border border-red-200 bg-red-50 p-3.5 text-red-900">
          <div className="flex items-center gap-2 text-sm font-bold text-red-800">
            <HiOutlineExclamationCircle aria-hidden className="h-4 w-4" />
            <span>CẢNH BÁO DẤU HIỆU NGUY HIỂM (CẤP CỨU)</span>
          </div>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-red-700">
            {result.redFlags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cột 1: Gợi ý bệnh */}
        <div className="rounded-tile border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-semibold">Gợi ý bệnh</h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Có thể chọn nhiều bệnh nếu nghi ngờ bệnh nhân mắc đồng thời (bệnh kép)
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">Xác suất</span>
          </div>

          <fieldset className="space-y-2">
            <legend className="sr-only">Chọn bệnh gợi ý</legend>
            {(result.diseases || []).map((disease, index) => {
              const checked = selectedDiseases.includes(disease.name);
              const isDiagnosed = checked || (activeDiseases.length === 1 && activeDiseases[0] === disease.name);
              return (
                <label
                  key={`${disease.name}-${index}`}
                  className={cn(
                    "block cursor-pointer rounded-field border p-3 transition-colors",
                    isDiagnosed ? "border-primary bg-tile" : "border-transparent hover:bg-tile"
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
                        <p className="text-sm font-semibold">
                          {index + 1}. {disease.name}
                          {isDiagnosed && (
                            <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                              Đang chẩn
                            </span>
                          )}
                        </p>
                        <span className="shrink-0 text-sm font-bold tabular-nums">{disease.probability}%</span>
                      </div>
                      <ProbabilityBar value={disease.probability} />
                      {disease.description && (
                        <p className="mt-1.5 text-xs text-muted-foreground">{disease.description}</p>
                      )}
                      {disease.specialty && (
                        <p className="mt-1 text-[11px] font-medium text-muted-foreground">Khoa: {disease.specialty}</p>
                      )}
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onApplyDiagnosis([disease.name]);
                          }}
                          className="text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          Áp dụng bệnh này
                        </button>
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </fieldset>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="truncate text-xs text-muted-foreground" aria-live="polite">
              {selectedDiseases.length > 0
                ? `Đã chọn: ${selectedDiseases.join(", ")}`
                : activeDiseases.length > 0
                ? `Đang xem: ${activeDiseases.join(", ")}`
                : "Chưa chẩn bệnh nào"}
            </p>
            <Button size="sm" disabled={selectedDiseases.length === 0} onClick={() => onApplyDiagnosis()}>
              Áp dụng vào chẩn đoán
            </Button>
          </div>
        </div>

        {/* Cột 2: Gợi ý thuốc */}
        <div className="rounded-tile border border-border bg-card p-4">
          <div className="mb-3 flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">Gợi ý thuốc điều trị</h4>
                {loadingProtocol && (
                  <span className="text-xs font-medium text-muted-foreground animate-pulse">Đang tra cứu phác đồ…</span>
                )}
              </div>
              {activeDiseases.length > 0 ? (
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  Đang lọt kiểm thuốc trị: <span className="font-semibold underline">{activeDiseases.join(", ")}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Chọn một bệnh bên trái để xem danh mục thuốc điều trị chính xác.
                </p>
              )}
            </div>

            {/* Tabs chuyển giữa "Theo bệnh" và "Tất cả gợi ý" */}
            <div className="flex shrink-0 self-start rounded-field bg-tile p-0.5 text-xs sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("DIAGNOSED")}
                aria-pressed={activeTab === "DIAGNOSED"}
                className={cn(
                  "rounded-[8px] px-2.5 py-1 font-medium transition",
                  activeTab === "DIAGNOSED" ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Theo bệnh ({medicinesForDiagnosed.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                aria-pressed={activeTab === "ALL"}
                className={cn(
                  "rounded-[8px] px-2.5 py-1 font-medium transition",
                  activeTab === "ALL" ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Tất cả ({allMeds.length})
              </button>
            </div>
          </div>

          {/* Thông báo nếu không có thuốc riêng biệt khi xem theo bệnh */}
          {activeTab === "DIAGNOSED" && medicinesForDiagnosed.length === 0 && allMeds.length > 0 && (
            <div className="mb-3 rounded-field border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
              Chưa tìm thấy thuốc phác đồ riêng cho <strong>"{activeDiseases.join(", ")}"</strong>. Đang hiển thị danh mục
              thuốc chung từ AI.
            </div>
          )}

          {/* Danh sách các thuốc */}
          <ul className="max-h-[500px] space-y-4 overflow-y-auto pr-1">
            {displayedMedicines.length === 0 ? (
              <li className="py-8 text-center text-xs text-muted-foreground">Chưa có gợi ý thuốc cho lựa chọn này.</li>
            ) : (
              displayedMedicines.map((medicine, index) => (
                <li key={`${medicine.name}-${index}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-semibold">
                          {index + 1}. {medicine.name}
                        </p>
                        {medicine.line === 1 && (
                          <span className="rounded border border-sky-200 bg-sky-100 px-1.5 py-0.2 text-[10px] font-semibold text-sky-800">
                            Phác đồ hàng 1
                          </span>
                        )}
                        {medicine.line === 2 && (
                          <span className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                            Phác đồ hàng 2
                          </span>
                        )}
                        {medicine.prescriptionRequired === false ? (
                          <span className="rounded bg-tile px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">OTC</span>
                        ) : (
                          <span className="rounded bg-tile px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                            Kê đơn (Rx)
                          </span>
                        )}
                      </div>
                      {medicine.activeIngredient && medicine.activeIngredient !== medicine.name && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Hoạt chất: <span className="font-medium text-foreground">{medicine.activeIngredient}</span>
                        </p>
                      )}
                    </div>
                    {medicine.probability && (
                      <span className="shrink-0 rounded-full bg-tile px-2 py-0.5 text-xs font-bold tabular-nums">
                        {medicine.probability}%
                      </span>
                    )}
                  </div>

                  {medicine.forDiseases && medicine.forDiseases.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[11px] text-muted-foreground">Trị bệnh:</span>
                      {medicine.forDiseases.map((d, i) => (
                        <span key={i} className="rounded bg-tile px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}

                  {medicine.usage && <p className="mt-1.5 text-xs text-muted-foreground">{medicine.usage}</p>}

                  {(medicine.dosage || medicine.instruction) && (
                    <div className="mt-2 space-y-1 rounded-field border border-border bg-background p-2 text-xs">
                      {medicine.dosage && (
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">Liều dùng:</span> {medicine.dosage}
                        </p>
                      )}
                      {medicine.instruction && (
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">Cách dùng:</span> {medicine.instruction}
                        </p>
                      )}
                    </div>
                  )}

                  {medicine.warnings && medicine.warnings.length > 0 && (
                    <div className="mt-2 rounded-field border border-red-200 bg-red-50 p-2 text-[11px] text-red-800">
                      {medicine.warnings.map((w, wi) => (
                        <p key={wi}>⚠ {w}</p>
                      ))}
                    </div>
                  )}

                  <div className="mt-2.5 flex justify-end border-t border-border pt-2">
                    <Button variant="ghost" size="sm" className="px-3 text-xs" onClick={() => onUseMedicine(medicine)}>
                      <HiOutlinePlus /> Thêm vào đơn
                    </Button>
                  </div>
                </li>
              ))
            )}
          </ul>

          <div className="mt-3 border-t border-border pt-2 text-right">
            <span className="text-[11px] text-muted-foreground">
              * Thuốc gợi ý mang tính tham khảo theo phác đồ CDSS. Bác sĩ quyết định điều trị theo tình trạng lâm sàng.
            </span>
          </div>
        </div>
      </div>

      {/* Lời khuyên dinh dưỡng & chăm sóc phục hồi */}
      {hasLifestyle && (
        <div className="rounded-tile border border-border bg-card p-4">
          <div className="flex flex-col gap-3 border-b border-border pb-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-semibold">
                Lời khuyên dinh dưỡng & chăm sóc phục hồi
                <span className="ml-2 text-xs font-medium text-muted-foreground">(theo bệnh: {lifestyle.disease})</span>
              </h4>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Hướng dẫn lối sống, chế độ ăn uống và các lưu ý chăm sóc thường ngày.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const parts = [];
                if (lifestyle.diets?.length) parts.push(`- Chế độ dinh dưỡng: ${lifestyle.diets.join("; ")}`);
                if (lifestyle.precautions?.length) parts.push(`- Lưu ý chăm sóc & phòng ngừa: ${lifestyle.precautions.join("; ")}`);
                if (lifestyle.workouts?.length) parts.push(`- Vận động & sinh hoạt: ${lifestyle.workouts.join("; ")}`);
                onApplyLifestyleToNotes(parts.join("\n"));
              }}
            >
              Sao chép vào Ghi chú điều trị
            </Button>
          </div>

          <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
            {lifestyle.diets && lifestyle.diets.length > 0 && (
              <div className="rounded-field border border-border bg-tile p-2.5">
                <p className="mb-1 font-semibold">Chế độ dinh dưỡng:</p>
                <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                  {lifestyle.diets.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {lifestyle.precautions && lifestyle.precautions.length > 0 && (
              <div className="rounded-field border border-border bg-tile p-2.5">
                <p className="mb-1 font-semibold">Lưu ý chăm sóc:</p>
                <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                  {lifestyle.precautions.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {lifestyle.workouts && lifestyle.workouts.length > 0 && (
              <div className="rounded-field border border-border bg-tile p-2.5">
                <p className="mb-1 font-semibold">Vận động & sinh hoạt:</p>
                <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                  {lifestyle.workouts.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
