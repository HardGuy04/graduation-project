import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { HiOutlineEye, HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi";
import Button from "../../components/ui/Button";
import { AccountStatusBadge } from "../../components/ui/StatusBadge";
import { TableShell, Th, Td, Tr } from "../../components/ui/Table";
import { SearchInput } from "../../components/app/Field";
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
    <div className="space-y-5">
      <SearchInput className="max-w-xs" label="Tìm bệnh nhân" placeholder="Tìm theo tên, SĐT, email…" value={q} onChange={(e) => setQ(e.target.value)} />

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
                    <Avatar name={p.fullName} src={p.avatarUrl} size="sm" />
                    <span className="font-semibold">{p.fullName}</span>
                  </div>
                </Td>
                <Td>{GENDER[p.gender] || "—"}</Td>
                <Td>{formatDate(p.dateOfBirth)}</Td>
                <Td>{p.phone}<br /><span className="text-xs text-muted-foreground">{p.email}</span></Td>
                <Td><AccountStatusBadge status={p.status} /></Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button asChild variant="ghost" size="icon" title="Xem chi tiết">
                      <Link to={`/admin/patients/${p.id}`} aria-label={`Xem hồ sơ ${p.fullName}`}><HiOutlineEye /></Link>
                    </Button>
                    <Button
                      variant={p.status === "active" ? "ghost-danger" : "ghost"}
                      size="icon"
                      onClick={() => setToggleTarget(p)}
                      title={p.status === "active" ? "Khóa" : "Mở khóa"}
                      aria-label={`${p.status === "active" ? "Khóa tài khoản" : "Mở khóa"} ${p.fullName}`}
                    >
                      {p.status === "active" ? <HiOutlineLockClosed /> : <HiOutlineLockOpen />}
                    </Button>
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
