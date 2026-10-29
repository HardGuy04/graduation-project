import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { HiOutlineArrowLeft } from "react-icons/hi";
import Card from "../../components/ui/Card";
import Avatar from "../../components/ui/Avatar";
import Tabs from "../../components/ui/Tabs";
import { AppointmentStatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import { TimeChip } from "../../components/app/Surface";
import { Button } from "@/components/kit/button";
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
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/patients"><HiOutlineArrowLeft /> Quay lại danh sách bệnh nhân</Link>
      </Button>

      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={patient.fullName} src={patient.avatarUrl} size="lg" />
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
            <div className="divide-y divide-border">
              {patient.history.map((a) => (
                <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                  <TimeChip time={a.startTime} date={formatDate(a.date, { day: "2-digit", month: "2-digit" })} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.doctorName} · {a.doctorSpecialty}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{a.reason}</p>
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
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">{formatDateLong(r.createdAt)}</p>
                    <h3 className="mt-1 text-title">{r.diagnosis || <span className="font-normal italic text-muted-foreground">Chưa xác định</span>}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Bác sĩ: {r.doctorName} · {r.doctorSpecialty}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-field bg-tile/60 p-4">
                    <p className="mb-1 font-semibold">Triệu chứng</p>
                    <p className="text-muted-foreground">{r.symptoms}</p>
                  </div>
                  <div className="rounded-field bg-tile/60 p-4">
                    <p className="mb-1 font-semibold">Ghi chú điều trị</p>
                    <p className="text-muted-foreground">{r.notes || "—"}</p>
                  </div>
                </div>
                {r.prescription && (
                  <div className="mt-3 rounded-field border border-border p-4">
                    <p className="mb-2 text-sm font-semibold">Đơn thuốc</p>
                    <ul className="space-y-1.5 text-sm">
                      {r.prescription.details.map((d, i) => (
                        <li key={i} className="flex justify-between gap-4">
                          <span>{d.medicineName} — {d.dosage}</span>
                          <span className="text-muted-foreground">SL: {d.quantity}</span>
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
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
