import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { HiOutlineEye, HiOutlineCheckCircle, HiOutlineClock } from "react-icons/hi";
import { StatTile } from "../../components/app/StatTile";
import Modal from "../../components/ui/Modal";
import Tabs from "../../components/ui/Tabs";
import Button from "../../components/ui/Button";
import { InvoiceStatusBadge } from "../../components/ui/StatusBadge";
import { TableShell, Th, Td, Tr } from "../../components/ui/Table";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { adminService } from "../../services/adminService";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { PAYMENT_METHOD_LABEL } from "../../utils/constants";

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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile icon={HiOutlineCheckCircle} label="Đã thu" value={formatCurrency(totalPaid)} />
        <StatTile icon={HiOutlineClock} label="Chưa thu" value={formatCurrency(totalUnpaid)} />
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
                <Td className="font-mono text-xs text-muted-foreground">#{inv.id}</Td>
                <Td className="font-semibold">{inv.patientName}</Td>
                <Td>{formatDate(inv.createdAt)}</Td>
                <Td className="font-semibold">{formatCurrency(inv.amount)}</Td>
                <Td>
                  <InvoiceStatusBadge status={inv.status} />
                  {inv.paymentMethod && (
                    <p className="mt-1 text-xs text-muted-foreground">{PAYMENT_METHOD_LABEL[inv.paymentMethod] || inv.paymentMethod}</p>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button variant="ghost" size="icon" onClick={() => setDetail(inv)} title="Xem chi tiết" aria-label={`Xem hóa đơn #${inv.id}`}>
                      <HiOutlineEye />
                    </Button>
                    {inv.status === "unpaid" && (
                      <Button variant="ghost" size="icon" className="text-accent hover:bg-accent-soft" onClick={() => setConfirmTarget(inv)} title="Xác nhận thanh toán" aria-label={`Xác nhận thanh toán hóa đơn #${inv.id}`}>
                        <HiOutlineCheckCircle />
                      </Button>
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
            <div className="divide-y divide-border rounded-tile bg-tile/60">
              {detail.items.map((it, i) => (
                <div key={i} className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{it.label}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(it.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="font-semibold">Tổng cộng</span>
              <span className="text-headline tabular-nums">{formatCurrency(detail.amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <InvoiceStatusBadge status={detail.status} />
                {detail.paymentMethod && (
                  <span className="text-sm text-muted-foreground">
                    qua {PAYMENT_METHOD_LABEL[detail.paymentMethod] || detail.paymentMethod}
                  </span>
                )}
              </span>
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
