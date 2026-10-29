import { useEffect, useMemo, useState } from "react";
import { HiOutlineArrowLeft, HiOutlineUserGroup, HiOutlineClipboardList, HiOutlineChevronRight } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import Avatar from "../../components/ui/Avatar";
import { Card, Tile } from "../../components/app/Surface";
import { Badge } from "../../components/app/Badge";
import { SearchInput } from "../../components/app/Field";
import { Empty, Loading, SkeletonList } from "../../components/app/Feedback";
import { PageHeader } from "../../components/app/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { doctorService } from "../../services/doctorService";
import { formatDateLong } from "../../utils/formatters";

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

  if (loading) return <Loading label="Đang tải danh sách bệnh nhân…" />;

  if (selected) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="-ml-3">
          <HiOutlineArrowLeft /> Danh sách bệnh nhân
        </Button>

        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={selected.name} color="#4E635A" size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-headline">{selected.name}</h1>
            <p className="text-sm text-muted-foreground">SĐT: {selected.phone || "—"}</p>
          </div>
          <Badge tone="solid">{selected.visits} lượt khám</Badge>
        </Card>

        <section aria-labelledby="history-title">
          <h2 id="history-title" className="mb-4 text-title">Lịch sử khám bệnh</h2>
          {records === null ? (
            <SkeletonList rows={2} />
          ) : records.length === 0 ? (
            <Empty icon={HiOutlineClipboardList} title="Chưa có hồ sơ bệnh án nào" />
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-6">
              {records.map((r, i) => (
                <li key={r.id} className="relative">
                    <span aria-hidden className="absolute -left-[31px] top-6 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                    <Card as="article">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{formatDateLong(r.createdAt)}</p>
                      <h3 className="mt-1 text-title">
                        {r.diagnosis || <span className="font-normal italic text-muted-foreground">Chưa xác định</span>}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{r.symptoms}</p>
                      {r.prescription && (
                        <Tile className="mt-4">
                          <p className="mb-1.5 text-xs font-semibold">Đơn thuốc</p>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {r.prescription.details.map((d, j) => <li key={j}>{d.medicineName} — {d.dosage}</li>)}
                          </ul>
                        </Tile>
                      )}
                    </Card>
                  </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Bệnh nhân"
        title="Tra cứu bệnh nhân"
        description="Xem lịch sử khám của những bệnh nhân bạn phụ trách."
        actions={
          <SearchInput
            label="Tìm bệnh nhân"
            placeholder="Tìm theo tên, số điện thoại…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full sm:w-80"
          />
        }
      />

      {patients.length === 0 ? (
        <Empty
          icon={HiOutlineUserGroup}
          title={q ? "Không tìm thấy bệnh nhân phù hợp" : "Chưa có bệnh nhân nào"}
          description={q ? undefined : "Bệnh nhân sẽ xuất hiện tại đây sau khi có lịch hẹn với bạn."}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((p, i) => (
            <li key={p.id}>
                <Button
                  variant="inverted"
                  onClick={() => openPatient(p)}
                  className="h-auto w-full rounded-card border border-border p-4 text-left font-normal shadow-none hover:border-accent/50 [&>span]:w-full [&>span]:justify-start [&>span]:gap-3"
                >
                  <Avatar name={p.name} color="#4E635A" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block text-xs text-muted-foreground">{p.visits} lượt khám{p.phone ? ` · ${p.phone}` : ""}</span>
                  </span>
                  <HiOutlineChevronRight aria-hidden className="text-subtle" />
                </Button>
              </li>
          ))}
        </ul>
      )}
    </div>
  );
}
