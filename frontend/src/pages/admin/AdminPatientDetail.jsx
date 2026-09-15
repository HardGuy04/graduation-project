import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { HiOutlineArrowLeft } from "react-icons/hi";
import Card, { CardHeader } from "../../components/ui/Card";
import Avatar from "../../components/ui/Avatar";
import Tabs from "../../components/ui/Tabs";
import { AppointmentStatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import { adminService } from "../../services/adminService";
import { formatDate, formatDateLong } from "../../utils/formatters";
import { GENDER_LABEL } from "../../utils/constants";

export default function AdminPatientDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [tab, setTab] = useState("history");

  useEffect(() => {
    (async () => {
      const res = await adminService.getPatientDetail(id);
      setPatient(res.data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <Spinner label="Đang tải hồ sơ bệnh nhân…" />;
  if (!patient) return <EmptyState title="Không tìm thấy bệnh nhân" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/admin/patients" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-teal-600">
        <HiOutlineArrowLeft className="h-4 w-4" /> Quay lại danh sách bệnh nhân
      </Link>

      <Card className="flex flex-col sm:flex-row sm:items-center gap-5">
        <Avatar name={patient.fullName} color="#3F9683" size="lg" />
        <div className="flex-1 grid sm:grid-cols-3 gap-3">
          <Info label="Họ và tên" value={patient.fullName} />
          <Info label="Giới tính" value={GENDER_LABEL[patient.gender] || "—"} />
          <Info label="Ngày sinh" value={formatDate(patient.dateOfBirth)} />
          <Info label="Điện thoại" value={patient.phone} />
          <Info label="Email" value={patient.email} />
          <Info label="Địa chỉ" value={patient.address || "—"} />
        </div>
      </Card>

      <Tabs
        tabs={[
          { value: "history", label: "Lịch sử lịch hẹn", count: patient.history.length },
          { value: "records", label: "Hồ sơ bệnh án", count: patient.records.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "history" ? (
        <Card padded={false}>
          {patient.history.length === 0 ? (
            <div className="p-6"><EmptyState title="Chưa có lịch hẹn nào" /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {patient.history.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="font-semibold text-ink">{a.doctorName} · {a.doctorSpecialty}</p>
                    <p className="text-xs text-ink-faint mt-0.5">{formatDate(a.date)} lúc {a.startTime} — {a.reason}</p>
                  </div>
                  <AppointmentStatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {patient.records.length === 0 ? (
            <EmptyState title="Chưa có hồ sơ bệnh án nào" />
          ) : (
            patient.records.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">{formatDateLong(r.createdAt)}</p>
                    <h4 className="mt-1 font-bold text-ink">{r.diagnosis || <span className="italic text-ink-faint font-normal">Chưa xác định</span>}</h4>
                    <p className="text-sm text-ink-faint mt-1">Bác sĩ: {r.doctorName} · {r.doctorSpecialty}</p>
                  </div>
                </div>
                <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
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
                    <ul className="space-y-1.5 text-sm text-ink-soft">
                      {r.prescription.details.map((d, i) => (
                        <li key={i} className="flex justify-between gap-4">
                          <span>{d.medicineName} — {d.dosage}</span>
                          <span className="text-ink-faint">SL: {d.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="font-semibold text-ink text-sm mt-0.5">{value}</p>
    </div>
  );
}
