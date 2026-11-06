import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "react-toastify";
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlinePlay,
  HiOutlineSparkles,
  HiOutlineInformationCircle,
} from "react-icons/hi";

import Card, { CardHeader } from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Avatar from "../../components/ui/Avatar";
import { AppointmentStatusBadge } from "../../components/ui/StatusBadge";
import {
  FormRow,
  Input,
  Textarea,
} from "../../components/ui/Field";
import {
  EmptyState,
  Spinner,
} from "../../components/ui/Feedback";
import { doctorService } from "../../services/doctorService";
import { aiService } from "../../services/aiService";
import { useAuth } from "../../context/AuthContext";
import {
  formatDate,
  formatDateLong,
} from "../../utils/formatters";

export default function DoctorAppointmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [appt, setAppt] = useState(null);

  async function load() {
    try {
      setLoading(true);

      const res =
        await doctorService.getAppointmentDetail(id);

      setAppt(res.data);
    } catch (error) {
      toast.error(
        error?.message ||
          "Không thể tải thông tin lịch hẹn."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateStatus(status) {
    try {
      await doctorService.updateAppointmentStatus(
        id,
        status
      );

      toast.success(
        "Cập nhật trạng thái thành công."
      );

      load();
    } catch (error) {
      toast.error(
        error?.message ||
          "Không thể cập nhật trạng thái lịch hẹn."
      );
    }
  }

  if (loading) {
    return (
      <Spinner label="Đang tải thông tin lịch hẹn…" />
    );
  }

  if (!appt) {
    return (
      <EmptyState title="Không tìm thấy lịch hẹn" />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        to="/doctor/appointments"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-teal-600"
      >
        <HiOutlineArrowLeft className="h-4 w-4" />
        Quay lại danh sách lịch hẹn
      </Link>

      {/* Thông tin lịch hẹn */}
      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar
          name={appt.patientName}
          color="#3F9683"
          size="lg"
        />

        <div className="flex-1">
          <h2 className="text-xl font-extrabold font-display text-ink">
            {appt.patientName}
          </h2>

          <p className="mt-0.5 text-sm text-ink-faint">
            SĐT: {appt.patientPhone} ·{" "}
            {formatDateLong(appt.date)} lúc{" "}
            {appt.startTime}
            {appt.roomName
              ? ` · ${appt.roomName}`
              : ""}
          </p>

          <p className="mt-2 text-sm text-ink-soft">
            <span className="font-semibold">
              Lý do khám:
            </span>{" "}
            {appt.reason}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <AppointmentStatusBadge
            status={appt.status}
          />

          {appt.status === "confirmed" && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                updateStatus("in_progress")
              }
            >
              <HiOutlinePlay className="h-4 w-4" />
              Bắt đầu khám
            </Button>
          )}
        </div>
      </Card>

      {/* Nội dung theo trạng thái lịch hẹn */}
      {appt.status === "completed" &&
      appt.record ? (
        <RecordSummary
          record={appt.record}
          prescription={appt.prescription}
        />
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
        <Card>
          <EmptyState
            title="Chưa thể ghi hồ sơ khám bệnh"
            description='Lịch hẹn cần ở trạng thái "Đang khám" để bác sĩ nhập triệu chứng, chẩn đoán và kê đơn thuốc.'
          />
        </Card>
      )}
    </div>
  );
}

/**
 * Hiển thị hồ sơ khám và đơn thuốc sau khi hoàn tất.
 */
function RecordSummary({
  record,
  prescription,
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Hồ sơ khám bệnh */}
      <Card>
        <CardHeader
          title="Hồ sơ khám bệnh"
          subtitle={formatDate(record.createdAt)}
        />

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-ink-soft">
              Triệu chứng
            </dt>

            <dd className="mt-0.5 text-ink-faint">
              {record.symptoms}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-ink-soft">
              Chẩn đoán
            </dt>

            <dd className="mt-0.5 text-ink-faint">
              {record.diagnosis || <span className="italic text-ink-faint">Chưa xác định</span>}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-ink-soft">
              Ghi chú điều trị
            </dt>

            <dd className="mt-0.5 text-ink-faint">
              {record.notes || "—"}
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-ink-soft">
              Ngày tái khám
            </dt>

            <dd className="mt-0.5 text-ink-faint">
              {record.followUpDate
                ? formatDate(record.followUpDate)
                : "Không hẹn tái khám"}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Đơn thuốc */}
      <Card>
        <CardHeader title="Đơn thuốc" />

        {!prescription ? (
          <p className="text-sm text-ink-faint">
            Chưa kê đơn thuốc cho lần khám này.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {prescription.details.map(
              (detail, index) => (
                <li
                  key={`${detail.medicineName}-${index}`}
                  className="flex justify-between gap-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      {detail.medicineName}
                    </p>

                    <p className="text-xs text-ink-faint">
                      {detail.dosage} ·{" "}
                      {detail.instruction || "—"}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-ink-faint">
                    SL: {detail.quantity}
                  </span>
                </li>
              )
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}

/**
 * Chuẩn hóa chuỗi tiếng Việt để so khớp không phân biệt dấu và hoa thường.
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
 * Kiểm tra xem thuốc có chỉ định điều trị cho bệnh lý hay không.
 */
function matchesDisease(med, diseaseName) {
  if (!med) return false;
  const target = normalizeText(diseaseName);
  if (!target) return false;

  // 1. So khớp qua danh sách bệnh được gán cho thuốc (forDiseases)
  if (Array.isArray(med.forDiseases) && med.forDiseases.length > 0) {
    const hasMatch = med.forDiseases.some((d) => {
      const dNorm = normalizeText(d);
      return (
        dNorm === target ||
        dNorm.includes(target) ||
        target.includes(dNorm)
      );
    });
    if (hasMatch) return true;
  }

  // 2. So khớp phụ qua công dụng (usage) hoặc ghi chú (note)
  const usageNorm = normalizeText(med.usage || "");
  const noteNorm = normalizeText(med.note || "");
  if (usageNorm.includes(target) || noteNorm.includes(target)) {
    return true;
  }

  return false;
}

/**
 * Form nhập hồ sơ khám và kê đơn thuốc.
 */
function MedicalRecordForm({
  doctorId,
  appointmentId,
  appointmentReason,
  onDone,
}) {
  const {
    register: registerRecord,
    handleSubmit: handleSubmitRecord,
    getValues,
    setValue: setRecordValue,
    watch: watchRecord,
    formState: {
      errors: recordErrors,
      isSubmitting: savingRecord,
    },
  } = useForm({
    // Điền sẵn triệu chứng từ "Lý do khám" bệnh nhân đã nhập lúc đặt lịch —
    // bác sĩ không cần gõ lại từ đầu mới bấm gợi ý AI được.
    defaultValues: {
      symptoms: appointmentReason || "",
    },
  });

  const {
    register: registerRx,
    control,
    handleSubmit: handleSubmitRx,
    formState: {
      isSubmitting: savingRx,
    },
  } = useForm({
    defaultValues: {
      details: [
        {
          medicineName: "",
          dosage: "",
          quantity: 1,
          instruction: "",
        },
      ],
    },
  });

  const { fields, append, remove, update } =
    useFieldArray({
      control,
      name: "details",
    });

  const [recordId, setRecordId] =
    useState(null);

  const [savedRecord, setSavedRecord] =
    useState(null);

  const [aiLoading, setAiLoading] =
    useState(false);

  const [aiResult, setAiResult] =
    useState(null);

  // Cho phép bác sĩ chọn NHIỀU bệnh gợi ý cùng lúc (hỗ trợ chẩn đoán bệnh kép/đa bệnh)
  const [selectedDiseases, setSelectedDiseases] =
    useState([]);

  function toggleDisease(name) {
    setSelectedDiseases((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    );
  }

  function applyDiagnosis(diseasesToApply) {
    const toApply = Array.isArray(diseasesToApply) ? diseasesToApply : selectedDiseases;
    if (!toApply || toApply.length === 0) return;
    setRecordValue("diagnosis", toApply.join(", "), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setSelectedDiseases(toApply);
    toast.success(
      toApply.length > 1
        ? `Đã áp dụng ${toApply.length} bệnh vào ô chẩn đoán`
        : `Đã áp dụng bệnh "${toApply[0]}" vào ô chẩn đoán`
    );
  }

  function handleUseMedicine(medicine) {
    const medName = medicine.name + (medicine.activeIngredient && medicine.activeIngredient !== medicine.name ? ` (${medicine.activeIngredient})` : "");
    const medData = {
      medicineName: medName,
      dosage: medicine.dosage || "",
      quantity: 1,
      instruction: medicine.instruction || "",
    };

    // Nếu dòng đầu tiên hoàn toàn trống thì ghi đè lên dòng đó
    if (fields.length === 1 && !fields[0].medicineName?.trim() && !fields[0].dosage?.trim()) {
      update(0, medData);
    } else {
      append(medData);
    }

    toast.success(`Đã thêm "${medicine.name}" vào đơn thuốc.`);
  }

  /**
   * Gọi chức năng gợi ý bệnh và thuốc.
   *
   * Gọi qua lớp aiService — khi có AI_SERVICE thật, chỉ cần sửa
   * src/services/aiService.js, KHÔNG cần sửa file này.
   */
  async function handleAiRecommendation() {
    const values = getValues();

    if (
      !values.symptoms?.trim() &&
      !values.diagnosis?.trim()
    ) {
      toast.warning(
        "Vui lòng nhập triệu chứng hoặc chẩn đoán trước."
      );

      return;
    }

    try {
      setAiLoading(true);

      const res =
        await aiService.predictDiseaseAndMedicine({
          symptoms: values.symptoms,
          diagnosis: values.diagnosis,
        });

      setAiResult(res.data);

      const diseases = res.data?.diseases || [];
      const currentDiag = (values.diagnosis || "").trim();

      // Nếu ô chẩn đoán đã có tên bệnh, ưu tiên chọn bệnh đó
      if (currentDiag && diseases.length > 0) {
        const matched = diseases.filter((d) =>
          normalizeText(currentDiag).includes(normalizeText(d.name)) ||
          normalizeText(d.name).includes(normalizeText(currentDiag))
        );
        if (matched.length > 0) {
          setSelectedDiseases(matched.map((m) => m.name));
        } else {
          setSelectedDiseases([diseases[0].name]);
        }
      } else if (diseases.length > 0) {
        // Tự động chọn bệnh có xác suất cao nhất để bác sĩ thấy ngay thuốc trị bệnh đó
        setSelectedDiseases([diseases[0].name]);
      } else {
        setSelectedDiseases([]);
      }
    } catch (error) {
      toast.error(
        error?.message || "Không thể lấy kết quả gợi ý từ AI."
      );
    } finally {
      setAiLoading(false);
    }
  }

  /**
   * Lưu hồ sơ khám bệnh.
   */
  async function onSubmitRecord(values) {
    try {
      const res =
        await doctorService.createMedicalRecord(
          doctorId,
          {
            ...values,
            appointmentId,
          }
        );

      setRecordId(res.data.id);
      setSavedRecord(res.data);

      toast.success(
        "Lưu hồ sơ khám bệnh thành công. Tiếp tục kê đơn thuốc bên dưới."
      );
    } catch (error) {
      toast.error(
        error?.message ||
          "Không thể lưu hồ sơ khám bệnh."
      );
    }
  }

  /**
   * Lưu đơn thuốc.
   */
  async function onSubmitRx(values) {
    if (!recordId) {
      toast.error(
        "Chưa có hồ sơ khám bệnh."
      );

      return;
    }

    const validDetails = values.details.filter(
      (detail) =>
        detail.medicineName?.trim() &&
        detail.dosage?.trim() &&
        Number(detail.quantity) > 0
    );

    if (validDetails.length === 0) {
      toast.warning(
        "Vui lòng nhập ít nhất một thuốc hợp lệ."
      );

      return;
    }

    try {
      await doctorService.createPrescription({
        medicalRecordId: recordId,
        details: validDetails,
      });

      toast.success(
        "Kê đơn thuốc thành công. Hoàn tất lượt khám!"
      );

      onDone();
    } catch (error) {
      toast.error(
        error?.message ||
          "Không thể lưu đơn thuốc."
      );
    }
  }

  /**
   * Giai đoạn 2: Kê đơn thuốc sau khi đã lưu hồ sơ.
   */
  if (savedRecord) {
    return (
      <Card>
        <CardHeader
          title="Kê đơn thuốc"
          subtitle={`Chẩn đoán: ${savedRecord.diagnosis || "Chưa xác định"}`}
        />

        <form
          onSubmit={handleSubmitRx(onSubmitRx)}
          className="space-y-3"
        >
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-12 items-start gap-2 rounded-xl bg-slate-50 p-3"
            >
              {/* Tên thuốc */}
              <div className="col-span-12 sm:col-span-4">
                <Input
                  placeholder="Tên thuốc"
                  {...registerRx(
                    `details.${index}.medicineName`,
                    {
                      required: true,
                    }
                  )}
                />
              </div>

              {/* Liều dùng */}
              <div className="col-span-6 sm:col-span-3">
                <Input
                  placeholder="Liều dùng"
                  {...registerRx(
                    `details.${index}.dosage`,
                    {
                      required: true,
                    }
                  )}
                />
              </div>

              {/* Số lượng */}
              <div className="col-span-3 sm:col-span-2">
                <Input
                  type="number"
                  min={1}
                  placeholder="SL"
                  {...registerRx(
                    `details.${index}.quantity`,
                    {
                      required: true,
                      valueAsNumber: true,
                      min: 1,
                    }
                  )}
                />
              </div>

              {/* Cách dùng */}
              <div className="col-span-9 sm:col-span-2">
                <Input
                  placeholder="Cách dùng"
                  {...registerRx(
                    `details.${index}.instruction`
                  )}
                />
              </div>

              {/* Xóa thuốc */}
              <button
                type="button"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
                className="col-span-3 flex h-full items-center justify-center rounded-lg p-2 text-clay-500 hover:bg-clay-50 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1"
                title={
                  fields.length === 1
                    ? "Phải có ít nhất một dòng thuốc"
                    : "Xóa thuốc"
                }
              >
                <HiOutlineTrash className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Thêm thuốc */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              append({
                medicineName: "",
                dosage: "",
                quantity: 1,
                instruction: "",
              })
            }
          >
            <HiOutlinePlus className="h-4 w-4" />
            Thêm thuốc
          </Button>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              loading={savingRx}
            >
              <HiOutlineCheck className="h-4 w-4" />
              Hoàn tất lượt khám
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  /**
   * Giai đoạn 1: Nhập hồ sơ khám bệnh.
   */
  return (
    <Card>
      <CardHeader
        title="Ghi hồ sơ khám bệnh"
        subtitle="Nhập thông tin thăm khám cho bệnh nhân"
      />

      <form
        onSubmit={handleSubmitRecord(
          onSubmitRecord
        )}
        className="space-y-4"
      >
        {/* Triệu chứng */}
        <FormRow
          label="Triệu chứng"
          required
          error={recordErrors.symptoms?.message}
          hint={
            appointmentReason
              ? "Đã tự điền từ lý do khám bệnh nhân đã nhập lúc đặt lịch — bạn có thể chỉnh sửa lại."
              : undefined
          }
        >
          <Textarea
            rows={2}
            placeholder="Mô tả triệu chứng bệnh nhân gặp phải"
            {...registerRecord("symptoms", {
              required: "Bắt buộc",
            })}
          />
        </FormRow>

        {/* Chẩn đoán */}
        <FormRow
          label="Chẩn đoán"
          hint="Không bắt buộc — có thể để trống nếu cần chờ kết quả xét nghiệm; hỗ trợ nhập nhiều bệnh (bệnh kép), phân tách bằng dấu phẩy"
        >
          <Input
            placeholder="VD: Viêm họng, Viêm dạ dày (để trống nếu chưa xác định)"
            {...registerRecord("diagnosis")}
          />
        </FormRow>

        {/* Ghi chú điều trị */}
        <FormRow label="Ghi chú điều trị">
          <Textarea
            rows={2}
            placeholder="Lời khuyên, hướng dẫn chăm sóc…"
            {...registerRecord("notes")}
          />
        </FormRow>

        {/* Ngày tái khám */}
        <FormRow
          label="Ngày hẹn tái khám"
          hint="Bỏ trống nếu không cần tái khám"
        >
          <Input
            type="date"
            {...registerRecord("followUpDate")}
          />
        </FormRow>

        {/* Khu vực hỗ trợ AI */}
        <div className="space-y-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-teal-900">
                Trợ lý AI hỗ trợ bác sĩ
              </h3>

              <p className="mt-1 text-sm text-teal-700">
                Gợi ý bệnh và thuốc theo xác suất từ
                1% đến 100%.
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              loading={aiLoading}
              onClick={handleAiRecommendation}
            >
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
              onUseMedicine={handleUseMedicine}
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
        </div>

        {/* Lưu hồ sơ */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            loading={savingRecord}
          >
            Lưu & tiếp tục kê đơn
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * Hiển thị danh sách gợi ý bệnh và thuốc từ AI.
 * Khi đã chọn/chẩn đoán bệnh, phần gợi ý thuốc sẽ lọc chính xác các thuốc điều trị bệnh đó.
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
          setProtocolMeds({
            disease: primaryDisease,
            medicines: data.medicines,
            details: data.disease,
          });
        } else if (!isCancelled) {
          setProtocolMeds(null);
        }
      } catch (err) {
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

  // Danh sách thuốc được lọc riêng cho bệnh đang chọn/chẩn đoán
  const medicinesForDiagnosed = useMemo(() => {
    // 1. Ưu tiên danh mục phác đồ chuẩn từ Cơ sở tri thức (có phân loại Hàng 1, Hàng 2)
    if (
      protocolMeds &&
      protocolMeds.disease === primaryDisease &&
      protocolMeds.medicines?.length > 0
    ) {
      return protocolMeds.medicines.map((m) => {
        // Tìm xem mô hình ML có cho điểm xác suất không
        const mlMatch = (result?.medicines || []).find(
          (x) => normalizeText(x.name) === normalizeText(m.name)
        );
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

    const filtered = result.medicines.filter((med) =>
      activeDiseases.some((d) => matchesDisease(med, d))
    );

    return filtered;
  }, [protocolMeds, primaryDisease, result, activeDiseases]);

  const allMeds = result?.medicines || [];
  const displayedMedicines =
    activeTab === "ALL"
      ? allMeds
      : medicinesForDiagnosed.length > 0
      ? medicinesForDiagnosed
      : allMeds;

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
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-900">
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <span className="text-base">🚨</span>
            <span>CẢNH BÁO DẤU HIỆU NGUY HIỂM (CẤP CỨU)</span>
          </div>
          <ul className="mt-1.5 list-inside list-disc text-xs text-rose-700 space-y-0.5">
            {result.redFlags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* CỘT 1: Gợi ý bệnh */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-ink flex items-center gap-1.5">
                  <span>Gợi ý chẩn đoán</span>
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                    {(result?.diseases || []).length} bệnh
                  </span>
                </h4>
                <p className="text-[11px] text-ink-faint mt-0.5">
                  Bấm vào bệnh để xem ngay thuốc điều trị tương ứng; tick ô vuông nếu chẩn đoán đồng thời nhiều bệnh.
                </p>
              </div>

              <span className="text-xs text-ink-faint shrink-0">Độ tin cậy</span>
            </div>

            <div className="space-y-2.5">
              {(result?.diseases || []).map((disease, index) => {
                const isChecked = selectedDiseases.includes(disease.name);
                const isDiagnosed =
                  isChecked ||
                  (activeDiseases.length === 1 && activeDiseases[0] === disease.name);

                return (
                  <div
                    key={`${disease.name}-${index}`}
                    onClick={() => onSelectOnlyDisease(disease.name)}
                    className={`block cursor-pointer rounded-xl border p-3 transition ${
                      isDiagnosed
                        ? "border-teal-500 bg-teal-50/70 shadow-sm"
                        : "border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleDisease(disease.name);
                        }}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-ink">
                              {index + 1}. {disease.name}
                            </p>
                            {isDiagnosed && (
                              <span className="rounded bg-teal-600 px-1.5 py-0.2 text-[10px] font-medium text-white">
                                Đang chọn
                              </span>
                            )}
                          </div>

                          <span className="shrink-0 text-sm font-bold text-teal-700">
                            {disease.probability}%
                          </span>
                        </div>

                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-teal-500 transition-all duration-500"
                            style={{
                              width: `${disease.probability}%`,
                            }}
                          />
                        </div>

                        {disease.description && (
                          <p className="mt-1 text-xs text-ink-faint line-clamp-2">
                            {disease.description}
                          </p>
                        )}

                        <div className="mt-2 flex items-center justify-between pt-1">
                          <span className="text-[11px] text-teal-700 font-medium">
                            {disease.specialty ? `Khoa: ${disease.specialty}` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyDiagnosis([disease.name]);
                            }}
                            className="text-xs text-teal-700 hover:text-teal-900 font-semibold underline underline-offset-2"
                          >
                            Áp dụng bệnh này
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-xs text-ink-faint truncate">
              {selectedDiseases.length > 0
                ? `Đã tick chọn: ${selectedDiseases.join(", ")}`
                : activeDiseases.length > 0
                ? `Đang xem: ${activeDiseases.join(", ")}`
                : "Chưa chọn bệnh nào"}
            </p>
            <Button
              type="button"
              size="sm"
              disabled={selectedDiseases.length === 0}
              onClick={() => onApplyDiagnosis()}
            >
              Áp dụng vào ô chẩn đoán
            </Button>
          </div>
        </div>

        {/* CỘT 2: Gợi ý thuốc */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
          <div>
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-ink">Gợi ý thuốc điều trị</h4>
                  {loadingProtocol && (
                    <span className="text-xs text-teal-600 animate-pulse font-medium">
                      Đang tra cứu phác đồ…
                    </span>
                  )}
                </div>
                {activeDiseases.length > 0 ? (
                  <p className="text-[11px] text-teal-800 font-medium mt-0.5">
                    🎯 Đang liệt kê thuốc trị:{" "}
                    <span className="font-bold underline">
                      {activeDiseases.join(", ")}
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] text-ink-faint mt-0.5">
                    Chọn một bệnh bên trái để xem danh mục thuốc điều trị chính xác.
                  </p>
                )}
              </div>

              {/* Tabs chuyển đổi giữa "Theo bệnh" và "Tất cả gợi ý" */}
              <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("DIAGNOSED")}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    activeTab === "DIAGNOSED"
                      ? "bg-white text-teal-800 shadow-sm font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Theo bệnh ({medicinesForDiagnosed.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ALL")}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    activeTab === "ALL"
                      ? "bg-white text-teal-800 shadow-sm font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Tất cả ({allMeds.length})
                </button>
              </div>
            </div>

            {/* Thông báo nếu không có thuốc riêng biệt khi xem theo bệnh */}
            {activeTab === "DIAGNOSED" &&
              medicinesForDiagnosed.length === 0 &&
              allMeds.length > 0 && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                  💡 Chưa tìm thấy thuốc phác đồ riêng cho{" "}
                  <strong>"{activeDiseases.join(", ")}"</strong>. Đang hiển thị danh mục thuốc hỗ trợ chung từ AI.
                </div>
              )}

            {/* Danh sách các thuốc */}
            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {displayedMedicines.length === 0 ? (
                <p className="py-8 text-center text-xs text-ink-faint">
                  Chưa có gợi ý thuốc cho lựa chọn này.
                </p>
              ) : (
                displayedMedicines.map((medicine, index) => {
                  return (
                    <div
                      key={`${medicine.name}-${index}`}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 transition hover:border-emerald-300 hover:bg-emerald-50/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-bold text-ink">
                              {index + 1}. {medicine.name}
                            </p>
                            {medicine.line === 1 && (
                              <span className="rounded bg-sky-100 text-sky-800 border border-sky-200 px-1.5 py-0.2 text-[10px] font-semibold">
                                Phác đồ hàng 1
                              </span>
                            )}
                            {medicine.line === 2 && (
                              <span className="rounded bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 text-[10px] font-semibold">
                                Phác đồ hàng 2
                              </span>
                            )}
                            {medicine.prescriptionRequired === false ? (
                              <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-medium">
                                OTC
                              </span>
                            ) : (
                              <span className="rounded bg-slate-200 text-slate-700 px-1.5 py-0.2 text-[10px] font-medium">
                                Kê đơn (Rx)
                              </span>
                            )}
                          </div>

                          {medicine.activeIngredient &&
                            medicine.activeIngredient !== medicine.name && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                Hoạt chất:{" "}
                                <span className="font-medium text-slate-700">
                                  {medicine.activeIngredient}
                                </span>
                              </p>
                            )}
                        </div>

                        {medicine.probability && (
                          <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700">
                            {medicine.probability}%
                          </span>
                        )}
                      </div>

                      {/* Nhãn bệnh điều trị */}
                      {medicine.forDiseases && medicine.forDiseases.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                          <span className="text-[11px] text-ink-faint">Trị bệnh:</span>
                          {medicine.forDiseases.map((d, i) => (
                            <span
                              key={i}
                              className="rounded bg-emerald-100/80 text-emerald-800 px-1.5 py-0.5 text-[10px] font-medium"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Công dụng */}
                      {medicine.usage && (
                        <p className="mt-1.5 text-xs text-ink-light">
                          {medicine.usage}
                        </p>
                      )}

                      {/* Liều dùng & Cách dùng */}
                      {(medicine.dosage || medicine.instruction) && (
                        <div className="mt-2 space-y-1 rounded-lg bg-white border border-slate-200/80 p-2 text-xs">
                          {medicine.dosage && (
                            <p className="text-slate-700">
                              <span className="font-semibold text-slate-900">
                                Liều dùng:
                              </span>{" "}
                              {medicine.dosage}
                            </p>
                          )}
                          {medicine.instruction && (
                            <p className="text-slate-600">
                              <span className="font-semibold text-slate-900">
                                Cách dùng:
                              </span>{" "}
                              {medicine.instruction}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Cảnh báo dị ứng / chống chỉ định */}
                      {medicine.warnings && medicine.warnings.length > 0 && (
                        <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-800">
                          {medicine.warnings.map((w, wi) => (
                            <p key={wi}>⚠️ {w}</p>
                          ))}
                        </div>
                      )}

                      {/* Nút thêm vào đơn thuốc */}
                      <div className="mt-2.5 flex justify-end border-t border-slate-200/50 pt-2">
                        <button
                          type="button"
                          onClick={() => onUseMedicine(medicine)}
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 border border-teal-200 hover:bg-teal-100 transition"
                        >
                          <HiOutlinePlus className="h-3.5 w-3.5" />
                          <span>Thêm vào đơn</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-3 border-t border-slate-100 pt-2 text-right">
            <span className="text-[11px] text-ink-faint">
              * Thuốc gợi ý mang tính tham khảo theo phác đồ CDSS. Bác sĩ quyết định theo tình trạng lâm sàng.
            </span>
          </div>
        </div>
      </div>

      {/* Lời khuyên dinh dưỡng & chăm sóc phục hồi */}
      {hasLifestyle && (
        <div className="rounded-xl border border-teal-200 bg-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-teal-100 pb-2.5">
            <div>
              <h4 className="font-bold text-teal-900 flex items-center gap-1.5">
                <span>🌿 Lời khuyên dinh dưỡng & chăm sóc phục hồi</span>
                <span className="text-xs font-medium text-teal-700">
                  (theo bệnh: {lifestyle.disease})
                </span>
              </h4>
              <p className="text-[11px] text-ink-faint mt-0.5">
                Hướng dẫn lối sống, chế độ ăn uống và các lưu ý chăm sóc hỗ trợ người bệnh mau lành.
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const parts = [];
                if (lifestyle.diets?.length) {
                  parts.push(`- Chế độ dinh dưỡng: ${lifestyle.diets.join("; ")}`);
                }
                if (lifestyle.precautions?.length) {
                  parts.push(`- Lưu ý chăm sóc & phòng ngừa: ${lifestyle.precautions.join("; ")}`);
                }
                if (lifestyle.workouts?.length) {
                  parts.push(`- Vận động & sinh hoạt: ${lifestyle.workouts.join("; ")}`);
                }
                onApplyLifestyleToNotes(parts.join("\n"));
              }}
            >
              Sao chép vào Ghi chú điều trị
            </Button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
            {lifestyle.diets && lifestyle.diets.length > 0 && (
              <div className="rounded-lg bg-teal-50/50 border border-teal-100 p-2.5">
                <p className="font-semibold text-teal-900 mb-1">🥗 Chế độ dinh dưỡng:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  {lifestyle.diets.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            {lifestyle.precautions && lifestyle.precautions.length > 0 && (
              <div className="rounded-lg bg-teal-50/50 border border-teal-100 p-2.5">
                <p className="font-semibold text-teal-900 mb-1">🛡️ Lưu ý chăm sóc:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  {lifestyle.precautions.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {lifestyle.workouts && lifestyle.workouts.length > 0 && (
              <div className="rounded-lg bg-teal-50/50 border border-teal-100 p-2.5">
                <p className="font-semibold text-teal-900 mb-1">🏃‍♂️ Vận động & sinh hoạt:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
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
