import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { HiOutlineCreditCard, HiOutlineCheckCircle, HiOutlineShieldCheck, HiOutlinePlus, HiOutlineReceiptTax } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import { Card, Tile } from "../../components/app/Surface";
import { InvoiceBadge } from "../../components/app/Badge";
import { FormRow, Input } from "../../components/app/Field";
import { AppDialog } from "../../components/app/Dialog";
import { Empty, ErrorNote, Loading } from "../../components/app/Feedback";
import { PageHeader } from "../../components/app/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { patientService } from "../../services/patientService";
import { formatCurrency, formatDate } from "../../utils/formatters";

const QUICK_AMOUNTS = [500000, 1000000, 2000000, 5000000];

export default function PatientInvoices() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [balance, setBalance] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [params, setParams] = useSearchParams();

  async function load() {
    setLoading(true);
    const [i, w] = await Promise.all([patientService.getInvoices(user.id), patientService.getWalletBalance(user.id)]);
    setList(i.data);
    setBalance(w.data.balance);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user.id]); // eslint-disable-line

  useEffect(() => {
    const topup = params.get("topup");
    if (!topup) return;
    if (topup === "ok") toast.success("Nạp ví thành công");
    if (topup === "fail") toast.error("Thanh toán nạp ví không thành công");
    params.delete("topup");
    setParams(params, { replace: true });
    load();
  }, []); // eslint-disable-line

  if (loading) return <Loading label="Đang tải hóa đơn của bạn…" />;

  const unpaid = list.filter((i) => i.status === "unpaid");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Thanh toán" title="Hóa đơn" description="Thanh toán hóa đơn khám bằng số dư ví MediPay hoặc nạp thêm qua VNPay." />

      <section className="flex flex-col gap-6 rounded-card bg-banner p-6 text-foreground sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/70 text-accent">
            <HiOutlineShieldCheck aria-hidden className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Số dư khả dụng · MediPay Wallet</p>
            <p className="text-display-md tabular-nums">{formatCurrency(balance)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {unpaid.length > 0 && (
            <span className="text-sm text-muted-foreground">{unpaid.length} hóa đơn chờ thanh toán</span>
          )}
          <Button onClick={() => setTopUpOpen(true)}>
            <HiOutlinePlus /> Nạp tiền
          </Button>
        </div>
      </section>

      {list.length === 0 ? (
        <Empty icon={HiOutlineReceiptTax} title="Bạn chưa có hóa đơn nào" />
      ) : (
        <ul className="grid gap-3">
          {list.map((inv, i) => (
            <li key={inv.id}>
                <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-tile bg-tile">
                      <HiOutlineReceiptTax aria-hidden className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold">Hóa đơn #{inv.id}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(inv.createdAt)} · {inv.items.length} khoản mục</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <span className="text-headline tabular-nums">{formatCurrency(inv.amount)}</span>
                    <InvoiceBadge status={inv.status} />
                    {inv.status === "unpaid" && (
                      <Button size="sm" onClick={() => setPayTarget(inv)}><HiOutlineCreditCard /> Thanh toán</Button>
                    )}
                  </div>
                </Card>
              </li>
          ))}
        </ul>
      )}

      <PayDialog
        invoice={payTarget}
        balance={balance}
        patientId={user.id}
        onClose={() => setPayTarget(null)}
        onRequestTopUp={() => { setPayTarget(null); setTopUpOpen(true); }}
        onSuccess={(newBalance) => { setBalance(newBalance); setPayTarget(null); load(); }}
      />

      <TopUpDialog
        open={topUpOpen}
        patientId={user.id}
        onClose={() => setTopUpOpen(false)}
        onSuccess={(newBalance) => { setBalance(newBalance); setTopUpOpen(false); }}
      />
    </div>
  );
}

function SuccessState({ title, children }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center" role="status">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <HiOutlineCheckCircle aria-hidden className="h-8 w-8" />
      </span>
      <p className="text-title">{title}</p>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function PayDialog({ invoice, balance, patientId, onClose, onRequestTopUp, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (invoice) { setAmount(String(invoice.amount)); setError(""); setStep("form"); }
  }, [invoice]);

  const insufficient = invoice && balance < invoice.amount;

  async function handleTransfer() {
    setError("");
    if (!invoice) return;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) { setError("Vui lòng nhập số tiền hợp lệ"); return; }
    if (numAmount !== invoice.amount) {
      setError(`Số tiền phải khớp chính xác với hóa đơn: ${formatCurrency(invoice.amount)}`);
      return;
    }
    if (balance < numAmount) {
      setError("Số dư tài khoản không đủ để thực hiện giao dịch này");
      return;
    }
    setSubmitting(true);
    try {
      const res = await patientService.payInvoice(invoice.id, numAmount, patientId);
      setStep("success");
      setTimeout(() => onSuccess(res.data.newBalance), 900);
    } catch (err) {
      setError(err.message || "Giao dịch thất bại, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppDialog
      open={!!invoice}
      onClose={onClose}
      title="Thanh toán hóa đơn"
      description="Thanh toán bằng số dư ví MediPay"
      size="sm"
      footer={invoice && step !== "success" && (
        <Button className="w-full" onClick={handleTransfer} loading={submitting} disabled={insufficient}>
          Xác nhận thanh toán
        </Button>
      )}
    >
      {invoice && (
        step === "success" ? (
          <SuccessState title="Thanh toán thành công!">
            Đã thanh toán {formatCurrency(invoice.amount)} cho hóa đơn #{invoice.id}
          </SuccessState>
        ) : (
          <div className="space-y-4">
            <Tile className="space-y-2.5">
              <Row label="Số dư khả dụng" value={formatCurrency(balance)} />
              <Row label="Nội dung" value={`Thanh toán HĐ #${invoice.id}`} muted />
              <Row label="Số tiền hóa đơn" value={formatCurrency(invoice.amount)} />
            </Tile>

            {insufficient && (
              <ErrorNote>
                Số dư ví hiện không đủ để thanh toán hóa đơn này.
                <Button variant="link" size="sm" onClick={onRequestTopUp} className="ml-1 h-auto min-h-0 text-destructive">
                  Nạp tiền vào ví ngay →
                </Button>
              </ErrorNote>
            )}

            <FormRow label="Số tiền thanh toán" error={error}>
              <Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Nhập số tiền…" />
            </FormRow>
          </div>
        )
      )}
    </AppDialog>
  );
}

function Row({ label, value, muted }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "font-medium" : "font-bold tabular-nums"}>{value}</span>
    </div>
  );
}

function TopUpDialog({ open, patientId, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setAmount(""); setError(""); setStep("form"); }
  }, [open]);

  async function handleConfirm() {
    setError("");
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) { setError("Vui lòng nhập số tiền hợp lệ"); return; }
    setSubmitting(true);
    try {
      const res = await patientService.loadBalance(patientId, numAmount);
      if (res.data.paymentUrl) {
        window.location.href = res.data.paymentUrl;
        return;
      }
      setStep("success");
      toast.success("Nạp tiền vào ví thành công");
      setTimeout(() => onSuccess(Number(res.data.balance)), 900);
    } catch (err) {
      setError(err.message || "Nạp tiền thất bại, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Nạp tiền vào ví"
      description="Có cổng VNPay thì chuyển sang trang thanh toán; chưa cấu hình thì ghi nhận mô phỏng"
      size="sm"
      footer={step !== "success" && (
        <Button className="w-full" onClick={handleConfirm} loading={submitting}>
          Xác nhận nạp tiền
        </Button>
      )}
    >
      {step === "success" ? (
        <SuccessState title="Nạp tiền thành công!">
          Đã cộng {formatCurrency(Number(amount))} vào ví MediPay Wallet
        </SuccessState>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold">Chọn nhanh số tiền</p>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Số tiền gợi ý">
              {QUICK_AMOUNTS.map((v) => (
                <Button
                  key={v}
                  variant={Number(amount) === v ? "default" : "outline"}
                  aria-pressed={Number(amount) === v}
                  onClick={() => setAmount(String(v))}
                  className="tabular-nums"
                >
                  {formatCurrency(v)}
                </Button>
              ))}
            </div>
          </div>

          <FormRow label="Hoặc nhập số tiền khác" error={error}>
            <Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Nhập số tiền muốn nạp…" />
          </FormRow>
          <p className="text-center text-[11px] text-muted-foreground">Giao dịch mô phỏng cho mục đích demo, không phát sinh tiền thật.</p>
        </div>
      )}
    </AppDialog>
  );
}
