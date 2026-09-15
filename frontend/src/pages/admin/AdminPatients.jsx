import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { HiOutlineSearch, HiOutlineEye, HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi";
import Button from "../../components/ui/Button";
import { AccountStatusBadge } from "../../components/ui/StatusBadge";
import { TableShell, Th, Td, Tr } from "../../components/ui/Table";
import { Input } from "../../components/ui/Field";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Avatar from "../../components/ui/Avatar";
import { adminService } from "../../services/adminService";
import { formatDate } from "../../utils/formatters";
import { GENDER_LABEL as GENDER } from "../../utils/constants";

export default function AdminPatients() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [toggleTarget, setToggleTarget] = useState(null);

  async function load() {
    setLoading(true);
    const res = await adminService.getPatients({ q: q || undefined });
    setList(res.data);
    setLoading(false);
  }

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]); // eslint-disable-line

  async function handleToggle() {
    await adminService.togglePatientStatus(toggleTarget.id);
    toast.success("Đã cập nhật trạng thái tài khoản");
    setToggleTarget(null);
    load();
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="relative max-w-xs">
        <HiOutlineSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
        <Input placeholder="Tìm theo tên, SĐT, email…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <Spinner label="Đang tải danh sách bệnh nhân…" />
      ) : list.length === 0 ? (
        <EmptyState title="Không tìm thấy bệnh nhân" />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Bệnh nhân</Th><Th>Giới tính</Th><Th>Ngày sinh</Th><Th>Liên hệ</Th><Th>Trạng thái</Th><Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={p.fullName} color="#3F9683" size="sm" />
                    <span className="font-semibold">{p.fullName}</span>
                  </div>
                </Td>
                <Td>{GENDER[p.gender] || "—"}</Td>
                <Td>{formatDate(p.dateOfBirth)}</Td>
                <Td>{p.phone}<br /><span className="text-xs text-ink-faint">{p.email}</span></Td>
                <Td><AccountStatusBadge status={p.status} /></Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    <Link to={`/admin/patients/${p.id}`} className="p-2 rounded-lg text-ink-faint hover:bg-slate-100 hover:text-teal-600" title="Xem chi tiết">
                      <HiOutlineEye className="h-4 w-4" />
                    </Link>
                    <button onClick={() => setToggleTarget(p)} className="p-2 rounded-lg text-ink-faint hover:bg-slate-100 hover:text-clay-500" title={p.status === "active" ? "Khóa" : "Mở khóa"}>
                      {p.status === "active" ? <HiOutlineLockClosed className="h-4 w-4" /> : <HiOutlineLockOpen className="h-4 w-4" />}
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        danger={toggleTarget?.status === "active"}
        title={toggleTarget?.status === "active" ? "Khóa tài khoản bệnh nhân" : "Mở khóa tài khoản"}
        description={`Bạn có chắc chắn muốn ${toggleTarget?.status === "active" ? "khóa" : "mở khóa"} tài khoản của ${toggleTarget?.fullName}?`}
        confirmLabel={toggleTarget?.status === "active" ? "Khóa tài khoản" : "Mở khóa"}
      />
    </div>
  );
}
