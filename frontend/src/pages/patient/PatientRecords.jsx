import { useEffect, useState } from "react";
import { HiOutlineClipboardList } from "react-icons/hi";
import { Card, Tile } from "../../components/app/Surface";
import { Badge } from "../../components/app/Badge";
import { Empty, SkeletonList } from "../../components/app/Feedback";
import { useAuth } from "../../context/AuthContext";
import { patientService } from "../../services/patientService";
import { formatDate, formatDateLong } from "../../utils/formatters";

/** Panel "Lịch sử khám" trong trang Lịch khám. */
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

  if (loading) return <SkeletonList rows={2} />;
  if (records.length === 0) {
    return (
      <Empty
        icon={HiOutlineClipboardList}
        title="Chưa có hồ sơ bệnh án nào"
        description="Lịch sử khám bệnh của bạn sẽ hiển thị tại đây sau khi hoàn tất buổi khám."
      />
    );
  }

  return (
    <ol className="space-y-4">
        {records.map((r, i) => (
          <li key={r.id}>
            <Card as="article">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <time dateTime={r.createdAt}>{formatDateLong(r.createdAt)}</time>
                  </p>
                  <h3 className="mt-1 text-title">
                    {r.diagnosis || <span className="font-normal italic text-muted-foreground">Chưa xác định</span>}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">Bác sĩ {r.doctorName} · {r.doctorSpecialty}</p>
                </div>
                {r.followUpDate && <Badge tone="solid">Tái khám {formatDate(r.followUpDate)}</Badge>}
              </div>

              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold">Triệu chứng</dt>
                  <dd className="mt-1 text-muted-foreground">{r.symptoms || "—"}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Ghi chú điều trị</dt>
                  <dd className="mt-1 text-muted-foreground">{r.notes || "—"}</dd>
                </div>
              </dl>

              {r.prescription && (
                <Tile className="mt-5">
                  <p className="mb-2 text-sm font-semibold">Đơn thuốc</p>
                  <ul className="divide-y divide-input/60">
                    {r.prescription.details.map((d, i) => (
                      <li key={i} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium">{d.medicineName}</p>
                          <p className="text-xs text-muted-foreground">{d.dosage} · {d.instruction}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-semibold tabular-nums">SL {d.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </Tile>
              )}
            </Card>
          </li>
        ))}
    </ol>
  );
}
