import { useEffect, useState } from "react";
import Card, { CardHeader } from "../../components/ui/Card";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import { useAuth } from "../../context/AuthContext";
import { patientService } from "../../services/patientService";
import { formatDate, formatDateLong } from "../../utils/formatters";

export default function PatientRecords() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await patientService.getMedicalRecords(user.id);
      setRecords(res.data);
      setLoading(false);
    })();
  }, [user.id]);

  if (loading) return <Spinner label="Đang tải lịch sử khám bệnh…" />;
  if (records.length === 0) return <EmptyState title="Chưa có hồ sơ bệnh án nào" description="Lịch sử khám bệnh của bạn sẽ hiển thị tại đây sau khi hoàn tất buổi khám." />;

  return (
    <div className="space-y-4 animate-fade-in">
      {records.map((r) => (
        <Card key={r.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">{formatDateLong(r.createdAt)}</p>
              <h4 className="mt-1 text-lg font-bold text-ink">{r.diagnosis || <span className="italic text-ink-faint font-normal">Chưa xác định</span>}</h4>
              <p className="text-sm text-ink-faint mt-0.5">Bác sĩ: {r.doctorName} · {r.doctorSpecialty}</p>
            </div>
            {r.followUpDate && (
              <div className="rounded-lg bg-gold-50 px-3 py-1.5 text-xs font-semibold text-gold-600">
                Tái khám: {formatDate(r.followUpDate)}
              </div>
            )}
          </div>

          <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-ink-soft mb-1">Triệu chứng</p>
              <p className="text-ink-faint">{r.symptoms}</p>
            </div>
            <div>
              <p className="font-semibold text-ink-soft mb-1">Ghi chú điều trị</p>
              <p className="text-ink-faint">{r.notes || "—"}</p>
            </div>
          </div>

          {r.prescription && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink mb-2">Đơn thuốc</p>
              <ul className="divide-y divide-slate-200">
                {r.prescription.details.map((d, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium text-ink">{d.medicineName}</p>
                      <p className="text-xs text-ink-faint">{d.dosage} · {d.instruction}</p>
                    </div>
                    <span className="text-xs text-ink-faint shrink-0">SL: {d.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
