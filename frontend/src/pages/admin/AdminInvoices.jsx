import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { HiOutlineEye, HiOutlineCheckCircle } from "react-icons/hi";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Tabs from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import { InvoiceStatusBadge } from "../../components/ui/StatusBadge";
import { TableShell, Th, Td, Tr } from "../../components/ui/Table";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { adminService } from "../../services/adminService";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function AdminInvoices() {
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [status, setStatus] = useState("");
  const [detail, setDetail] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  async function load() {
    setLoading(true);
    const res = await adminService.getInvoices({ status: status || undefined });
    setList(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [status]); // eslint-disable-line

  async function handleConfirmPayment() {
    await adminService.confirmPayment(confirmTarget.id);
    toast.success("Đã xác nhận thanh toán");
    setConfirmTarget(null);
    setDetail(null);
    load();
  }

  const totalUnpaid = list.filter((i) => i.status === "unpaid").reduce((s, i) => s + i.amount, 0);
  const totalPaid = list.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="flex items-center justify-between">
          <div><p className="text-sm text-ink-faint">Đã thu</p><p className="text-2xl font-extrabold font-display text-leaf-600 mt-1">{formatCurrency(totalPaid)}</p></div>
        </Card>
        <Card className="flex items-center justify-between">
          <div><p className="text-sm text-ink-faint">Chưa thu</p><p className="text-2xl font-extrabold font-display text-gold-600 mt-1">{formatCurrency(totalUnpaid)}</p></div>
        </Card>
      </div>

      <Tabs
        tabs={[{ value: "", label: "Tất cả" }, { value: "unpaid", label: "Chưa thanh toán" }, { value: "paid", label: "Đã thanh toán" }]}
        active={status}
        onChange={setStatus}
      />

      {loading ? (
        <Spinner label="Đang tải danh sách hóa đơn…" />
      ) : list.length === 0 ? (
        <EmptyState title="Chưa có hóa đơn nào" />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Mã HĐ</Th><Th>Bệnh nhân</Th><Th>Ngày lập</Th><Th>Số tiền</Th><Th>Trạng thái</Th><Th className="text-right">Thao tác</Th>
            </tr>
          </thead>
          <tbody>
            {list.map((inv) => (
              <Tr key={inv.id}>
                <Td className="font-mono text-xs text-ink-faint">#{inv.id}</Td>
                <Td className="font-semibold">{inv.patientName}</Td>
                <Td>{formatDate(inv.createdAt)}</Td>
                <Td className="font-semibold">{formatCurrency(inv.amount)}</Td>
                <Td><InvoiceStatusBadge status={inv.status} /></Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => setDetail(inv)} className="p-2 rounded-lg text-ink-faint hover:bg-slate-100 hover:text-teal-600" title="Xem chi tiết">
                      <HiOutlineEye className="h-4 w-4" />
                    </button>
                    {inv.status === "unpaid" && (
                      <button onClick={() => setConfirmTarget(inv)} className="p-2 rounded-lg text-leaf-600 hover:bg-leaf-50" title="Xác nhận thanh toán">
                        <HiOutlineCheckCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Hóa đơn #${detail?.id}`} subtitle={detail?.patientName}>
        {detail && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 divide-y divide-slate-200">
              {detail.items.map((it, i) => (
                <div key={i} className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-ink-soft">{it.label}</span>
                  <span className="font-semibold text-ink">{formatCurrency(it.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="font-semibold text-ink">Tổng cộng</span>
              <span className="text-xl font-extrabold text-teal-600 font-display">{formatCurrency(detail.amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <InvoiceStatusBadge status={detail.status} />
              {detail.status === "unpaid" && (
                <Button size="sm" onClick={() => setConfirmTarget(detail)}>Xác nhận đã thu tiền</Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirmPayment}
        title="Xác nhận thanh toán"
        description={`Xác nhận đã thu ${formatCurrency(confirmTarget?.amount)} từ ${confirmTarget?.patientName}?`}
        confirmLabel="Xác nhận đã thu"
      />
    </div>
  );
}
