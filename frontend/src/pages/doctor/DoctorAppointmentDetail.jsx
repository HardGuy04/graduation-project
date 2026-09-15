import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { toast } from "react-toastify";
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlinePlay,
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

  const { fields, append, remove } =
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

  function applyDiagnosis() {
    setRecordValue("diagnosis", selectedDiseases.join(", "), {
      shouldValidate: true,
      shouldDirty: true,
    });
    toast.success(
      selectedDiseases.length > 1
        ? `Đã áp dụng ${selectedDiseases.length} bệnh vào ô chẩn đoán`
        : "Đã áp dụng vào ô chẩn đoán"
    );
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
      setSelectedDiseases([]);
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
              onToggleDisease={toggleDisease}
              onApplyDiagnosis={applyDiagnosis}
              onUseMedicine={(medicine) => {
                append({
                  medicineName: medicine.name,
                  dosage: "",
                  quantity: 1,
                  instruction: "",
                });

                toast.success(
                  `Đã thêm ${medicine.name} vào đơn thuốc mẫu.`
                );
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
 */
function AiRecommendationResult({
  result,
  selectedDiseases,
  onToggleDisease,
  onApplyDiagnosis,
  onUseMedicine,
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Danh sách bệnh */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-ink">
              Gợi ý bệnh
            </h4>
            <p className="text-[11px] text-ink-faint mt-0.5">
              Có thể tick nhiều bệnh nếu nghi ngờ bệnh nhân mắc đồng thời (bệnh kép)
            </p>
          </div>

          <span className="text-xs text-ink-faint shrink-0">
            Xác suất
          </span>
        </div>

        <div className="space-y-4">
          {result.diseases.map(
            (disease, index) => {
              const checked = selectedDiseases.includes(disease.name);
              return (
                <label
                  key={`${disease.name}-${index}`}
                  className={`block cursor-pointer rounded-xl border p-2.5 -m-2.5 transition ${
                    checked ? "border-teal-300 bg-teal-50/60" : "border-transparent hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleDisease(disease.name)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">
                          {index + 1}. {disease.name}
                        </p>

                        <span className="shrink-0 text-sm font-bold text-teal-700">
                          {disease.probability}%
                        </span>
                      </div>

                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all duration-500"
                          style={{
                            width: `${disease.probability}%`,
                          }}
                        />
                      </div>

                      <p className="mt-1 text-xs text-ink-faint">
                        {disease.description}
                      </p>
                    </div>
                  </div>
                </label>
              );
            }
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-ink-faint">
            {selectedDiseases.length > 0
              ? `Đã chọn ${selectedDiseases.length} bệnh`
              : "Chưa chọn bệnh nào"}
          </p>
          <Button
            type="button"
            size="sm"
            disabled={selectedDiseases.length === 0}
            onClick={onApplyDiagnosis}
          >
            Áp dụng vào chẩn đoán
          </Button>
        </div>
      </div>

      {/* Danh sách thuốc */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="font-bold text-ink">
            Gợi ý thuốc
          </h4>

          <span className="text-xs text-ink-faint">
            Xác suất
          </span>
        </div>

        <div className="space-y-4">
          {result.medicines.map(
            (medicine, index) => (
              <div
                key={`${medicine.name}-${index}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">
                    {index + 1}. {medicine.name}
                  </p>

                  <span className="shrink-0 text-sm font-bold text-emerald-700">
                    {medicine.probability}%
                  </span>
                </div>

                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${medicine.probability}%`,
                    }}
                  />
                </div>

                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-ink-faint">
                    {medicine.usage}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      onUseMedicine(medicine)
                    }
                    className="text-left text-xs font-semibold text-teal-700 hover:text-teal-900 sm:text-right"
                  >
                    + Thêm vào đơn
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}