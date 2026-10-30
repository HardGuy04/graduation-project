import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  HiOutlineCreditCard, HiOutlineCheckCircle, HiOutlineShieldCheck, HiOutlinePlus, HiOutlineReceiptTax,
  HiOutlineXCircle, HiOutlineCash, HiOutlineExternalLink,
} from "react-icons/hi";
import { Button } from "@/components/kit/button";
import { cn } from "@/lib/utils";
import { Card, Tile } from "../../components/app/Surface";
import { InvoiceBadge } from "../../components/app/Badge";
import { FormRow, Input } from "../../components/app/Field";
import { ComboboxField } from "../../components/app/ComboboxField";
import { AppDialog } from "../../components/app/Dialog";
import { Empty, ErrorNote, Loading } from "../../components/app/Feedback";
import { PageHeader } from "../../components/app/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { patientService } from "../../services/patientService";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { PAYMENT_METHOD_LABEL, VNPAY_BANK_OPTIONS, VNPAY_RESPONSE_MESSAGE } from "../../utils/constants";

const QUICK_AMOUNTS = [500000, 1000000, 2000000, 5000000];
const RETURN_KEYS = ["vnpay", "purpose", "code", "invoice", "wallet", "reason"];
const RETURN_ERRORS = {
  INVALID_SIGNATURE: "Chữ ký giao dịch không hợp lệ, giao dịch không được ghi nhận.",
  AMOUNT_MISMATCH: "Số tiền VNPay trả về không khớp với giao dịch.",
  PAYMENT_NOT_FOUND: "Không tìm thấy giao dịch tương ứng.",
  PAYMENT_NOT_READY: "Cổng VNPay chưa được cấu hình trên máy chủ.",
};

function readVnpayReturn(params) {
  const status = params.get("vnpay");
  if (!status) return null;
  return {
    status,
    purpose: params.get("purpose"),
    code: params.get("code"),
    invoiceId: params.get("invoice"),
    toWallet: params.get("wallet") === "1",
    reason: params.get("reason"),
  };
}

export default function PatientInvoices() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [balance, setBalance] = useState(null);
  const [payment, setPayment] = useState({ vnpayEnabled: false, minAmount: 10000 });
  const [payTarget, setPayTarget] = useState(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState(() => readVnpayReturn(params));

  async function load() {
    setLoading(true);
    const [i, w] = await Promise.all([patientService.getInvoices(user.id), patientService.getWalletBalance(user.id)]);
    setList(i.data);
    setBalance(w.data.balance);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user.id]); // eslint-disable-line

  useEffect(() => {
    patientService.getPaymentConfig().then((r) => setPayment(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!params.has("vnpay")) return;
    const next = new URLSearchParams(params);
    RETURN_KEYS.forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  }, []); // eslint-disable-line

  if (loading) return <Loading label="Đang tải hóa đơn của bạn…" />;

  const unpaid = list.filter((i) => i.status === "unpaid");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Thanh toán" title="Hóa đơn" description="Thanh toán hóa đơn khám bằng số dư ví MediPay hoặc trực tiếp qua cổng VNPay." />

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
          {list.map((inv) => (
            <li key={inv.id}>
              <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-tile bg-tile">
                    <HiOutlineReceiptTax aria-hidden className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold">Hóa đơn #{inv.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(inv.createdAt)} · {inv.items.length} khoản mục
                      {inv.paymentMethod && ` · ${PAYMENT_METHOD_LABEL[inv.paymentMethod] || inv.paymentMethod}`}
                    </p>
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
        payment={payment}
        onClose={() => setPayTarget(null)}
        onRequestTopUp={() => { setPayTarget(null); setTopUpOpen(true); }}
        onSuccess={(newBalance) => { setBalance(newBalance); setPayTarget(null); load(); }}
      />

      <TopUpDialog
        open={topUpOpen}
        patientId={user.id}
        payment={payment}
        onClose={() => setTopUpOpen(false)}
        onSuccess={(newBalance) => { setBalance(newBalance); setTopUpOpen(false); }}
      />

      <VnpayResultDialog result={result} onClose={() => setResult(null)} />
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

function FailureState({ title, children }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center" role="alert">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive-soft text-destructive">
        <HiOutlineXCircle aria-hidden className="h-8 w-8" />
      </span>
      <p className="text-title">{title}</p>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function MethodOption({ selected, disabled, icon: Icon, title, description, onSelect }) {
  return (
    <Button
      variant="outline"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "h-auto w-full items-stretch justify-start whitespace-normal rounded-tile p-4 text-left font-normal shadow-none",
        "[&>span]:flex [&>span]:w-full [&>span]:items-start [&>span]:gap-3",
        selected ? "border-accent bg-accent-soft ring-1 ring-accent hover:bg-accent-soft" : "hover:bg-card"
      )}
    >
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </Button>
  );
}

function VnpayNote() {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <HiOutlineExternalLink aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      Bạn sẽ được chuyển sang cổng VNPay (môi trường sandbox) để hoàn tất. Giao dịch hết hạn sau 15 phút.
    </p>
  );
}

function PayDialog({ invoice, balance, patientId, payment, onClose, onRequestTopUp, onSuccess }) {
  const [method, setMethod] = useState("wallet");
  const [bankCode, setBankCode] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const insufficient = invoice && balance < invoice.amount;
  const vnpayAllowed = payment.vnpayEnabled && invoice && invoice.amount >= payment.minAmount;

  useEffect(() => {
    if (!invoice) return;
    setAmount(String(invoice.amount));
    setError("");
    setStep("form");
    setBankCode("");
    setMethod(balance < invoice.amount && vnpayAllowed ? "vnpay" : "wallet");
  }, [invoice]); // eslint-disable-line

  async function handleWallet() {
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

  async function handleVnpay() {
    setError("");
    setSubmitting(true);
    try {
      const res = await patientService.payInvoiceVnpay(invoice.id, { bankCode });
      window.location.assign(res.data.paymentUrl);
    } catch (err) {
      setError(err.message || "Không tạo được giao dịch VNPay, vui lòng thử lại");
      setSubmitting(false);
    }
  }

  const isWallet = method === "wallet";

  return (
    <AppDialog
      open={!!invoice}
      onClose={onClose}
      title="Thanh toán hóa đơn"
      description={invoice ? `Hóa đơn #${invoice.id} · ${formatCurrency(invoice.amount)}` : undefined}
      size="sm"
      footer={invoice && step !== "success" && (
        <Button
          className="w-full"
          onClick={isWallet ? handleWallet : handleVnpay}
          loading={submitting}
          disabled={isWallet ? insufficient : !vnpayAllowed}
        >
          {isWallet ? "Xác nhận thanh toán" : "Thanh toán qua VNPay"}
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
            <div className="grid gap-2" role="group" aria-label="Phương thức thanh toán">
              <MethodOption
                selected={isWallet}
                icon={HiOutlineCash}
                title="Ví MediPay"
                description={`Số dư ${formatCurrency(balance)}`}
                onSelect={() => { setMethod("wallet"); setError(""); }}
              />
              <MethodOption
                selected={!isWallet}
                disabled={!vnpayAllowed}
                icon={HiOutlineCreditCard}
                title="VNPay"
                description={
                  !payment.vnpayEnabled
                    ? "Chưa cấu hình khóa VNPay sandbox trên máy chủ"
                    : invoice.amount < payment.minAmount
                      ? `VNPay chỉ nhận từ ${formatCurrency(payment.minAmount)}`
                      : "QR, thẻ ATM nội địa hoặc thẻ quốc tế"
                }
                onSelect={() => { setMethod("vnpay"); setError(""); }}
              />
            </div>

            {isWallet ? (
              <>
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
              </>
            ) : (
              <>
                <FormRow label="Hình thức tại VNPay" error={error}>
                  <ComboboxField options={VNPAY_BANK_OPTIONS} value={bankCode} onChange={setBankCode} placeholder="Chọn hình thức" />
                </FormRow>
                <VnpayNote />
              </>
            )}
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

function TopUpDialog({ open, patientId, payment, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const viaVnpay = payment.vnpayEnabled;

  useEffect(() => {
    if (open) { setAmount(""); setBankCode(""); setError(""); setStep("form"); }
  }, [open]);

  async function handleConfirm() {
    setError("");
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) { setError("Vui lòng nhập số tiền hợp lệ"); return; }
    if (viaVnpay && numAmount < payment.minAmount) {
      setError(`VNPay chỉ nhận giao dịch từ ${formatCurrency(payment.minAmount)}`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await patientService.loadBalance(patientId, numAmount, { bankCode });
      if (res.data.paymentUrl) {
        window.location.assign(res.data.paymentUrl);
        return;
      }
      setStep("success");
      toast.success("Nạp tiền vào ví thành công");
      setTimeout(() => onSuccess(Number(res.data.balance)), 900);
    } catch (err) {
      setError(err.message || "Nạp tiền thất bại, vui lòng thử lại");
    }
    setSubmitting(false);
  }

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Nạp tiền vào ví"
      description={viaVnpay ? "Thanh toán an toàn qua cổng VNPay" : "Chưa cấu hình VNPay, giao dịch được ghi nhận mô phỏng"}
      size="sm"
      footer={step !== "success" && (
        <Button className="w-full" onClick={handleConfirm} loading={submitting}>
          {viaVnpay ? "Tiếp tục với VNPay" : "Xác nhận nạp tiền"}
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

          {viaVnpay ? (
            <>
              <FormRow label="Hình thức tại VNPay">
                <ComboboxField options={VNPAY_BANK_OPTIONS} value={bankCode} onChange={setBankCode} placeholder="Chọn hình thức" />
              </FormRow>
              <VnpayNote />
            </>
          ) : (
            <p className="text-center text-[11px] text-muted-foreground">Giao dịch mô phỏng cho mục đích demo, không phát sinh tiền thật.</p>
          )}
        </div>
      )}
    </AppDialog>
  );
}

function VnpayResultDialog({ result, onClose }) {
  const ok = result?.status === "success";
  const isInvoice = result?.purpose === "invoice";
  const subject = isInvoice ? `hóa đơn #${result?.invoiceId}` : "nạp ví";

  let message = "";
  if (result) {
    if (ok) {
      message = isInvoice
        ? result.toWallet
          ? `Hóa đơn #${result.invoiceId} đã được thanh toán trước đó, số tiền từ VNPay đã được cộng vào ví của bạn.`
          : `Hóa đơn #${result.invoiceId} đã được thanh toán qua VNPay.`
        : "Số tiền đã được cộng vào ví MediPay của bạn.";
    } else if (result.status === "error") {
      message = RETURN_ERRORS[result.reason] || "Không xác nhận được kết quả từ VNPay.";
    } else {
      message = VNPAY_RESPONSE_MESSAGE[result.code] || "Giao dịch không thành công.";
    }
  }

  return (
    <AppDialog
      open={!!result}
      onClose={onClose}
      title="Kết quả thanh toán VNPay"
      size="sm"
      footer={<Button className="w-full" onClick={onClose}>Đóng</Button>}
    >
      {result && (ok ? (
        <SuccessState title={`Thanh toán ${subject} thành công`}>{message}</SuccessState>
      ) : (
        <FailureState title={`Thanh toán ${subject} chưa hoàn tất`}>
          {message}
          {result.code && <span className="mt-1 block text-xs">Mã phản hồi VNPay: {result.code}</span>}
        </FailureState>
      ))}
    </AppDialog>
  );
}
