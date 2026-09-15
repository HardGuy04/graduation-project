import { useEffect, useMemo, useState } from "react";
import { HiOutlineSearch, HiOutlineArrowLeft } from "react-icons/hi";
import Card, { CardHeader } from "../../components/ui/Card";
import Avatar from "../../components/ui/Avatar";
import { Input } from "../../components/ui/Field";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import { useAuth } from "../../context/AuthContext";
import { doctorService } from "../../services/doctorService";
import { formatDate, formatDateLong } from "../../utils/formatters";

export default function DoctorPatients() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [records, setRecords] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await doctorService.getMyAppointments(user.id);
      setAppointments(res.data);
      setLoading(false);
    })();
  }, [user.id]);

  const patients = useMemo(() => {
    const map = new Map();
    appointments.forEach((a) => {
      if (!map.has(a.patientId)) map.set(a.patientId, { id: a.patientId, name: a.patientName, phone: a.patientPhone, visits: 0 });
      map.get(a.patientId).visits += 1;
    });
    return [...map.values()].filter((p) => p.name.toLowerCase().includes(q.toLowerCase()) || p.phone?.includes(q));
  }, [appointments, q]);

  async function openPatient(p) {
    setSelected(p);
    setRecords(null);
    const res = await doctorService.getPatientRecords(p.id);
    setRecords(res.data);
  }

  if (loading) return <Spinner label="Đang tải danh sách bệnh nhân…" />;

  if (selected) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-faint hover:text-teal-600">
          <HiOutlineArrowLeft className="h-4 w-4" /> Quay lại danh sách bệnh nhân
        </button>

        <Card className="flex items-center gap-4">
          <Avatar name={selected.name} color="#3F9683" size="lg" />
          <div>
            <h2 className="text-xl font-extrabold font-display text-ink">{selected.name}</h2>
            <p className="text-sm text-ink-faint">SĐT: {selected.phone} · {selected.visits} lượt khám</p>
          </div>
        </Card>

        <div>
          <h3 className="font-bold text-ink mb-3">Lịch sử khám bệnh</h3>
          {records === null ? (
            <Spinner />
          ) : records.length === 0 ? (
            <EmptyState title="Chưa có hồ sơ bệnh án nào" />
          ) : (
            <div className="space-y-4">
              {records.map((r) => (
                <Card key={r.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">{formatDateLong(r.createdAt)}</p>
                  <h4 className="mt-1 font-bold text-ink">{r.diagnosis || <span className="italic text-ink-faint font-normal">Chưa xác định</span>}</h4>
                  <p className="text-sm text-ink-faint mt-1">{r.symptoms}</p>
                  {r.prescription && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3.5">
                      <p className="text-xs font-semibold text-ink-soft mb-1.5">Đơn thuốc</p>
                      <ul className="text-sm text-ink-faint space-y-1">
                        {r.prescription.details.map((d, i) => <li key={i}>{d.medicineName} — {d.dosage}</li>)}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="relative max-w-xs">
        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
        <Input placeholder="Tìm bệnh nhân theo tên, SĐT…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {patients.length === 0 ? (
        <EmptyState title="Chưa có bệnh nhân nào" description="Bệnh nhân sẽ xuất hiện tại đây sau khi có lịch hẹn với bạn." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((p) => (
            <button key={p.id} onClick={() => openPatient(p)} className="text-left">
              <Card className="flex items-center gap-3 hover:border-teal-200 transition h-full">
                <Avatar name={p.name} color="#3F9683" />
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate">{p.name}</p>
                  <p className="text-xs text-ink-faint">{p.visits} lượt khám</p>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
