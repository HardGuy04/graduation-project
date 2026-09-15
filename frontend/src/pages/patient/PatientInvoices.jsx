import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { HiOutlineCreditCard, HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineShieldCheck, HiOutlinePlus } from "react-icons/hi";
import clsx from "clsx";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import { Input, FieldError } from "../../components/ui/Field";
import { InvoiceStatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState, Spinner } from "../../components/ui/Feedback";
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

  async function load() {
    setLoading(true);
    const [i, w] = await Promise.all([patientService.getInvoices(user.id), patientService.getWalletBalance(user.id)]);
    setList(i.data);
    setBalance(w.data.balance);
    setLoading(false);
  }

  useEffect(() => { load(); }, [user.id]); // eslint-disable-line

  if (loading) return <Spinner label="Đang tải hóa đơn của bạn…" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-teal-700 border-none text-white">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl2 bg-teal-500/60 shrink-0">
            <HiOutlineShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-teal-100">Số dư khả dụng · MediPay Wallet</p>
            <p className="text-2xl font-extrabold font-display">{formatCurrency(balance)}</p>
          </div>
        </div>
        <Button variant="gold" size="sm" onClick={() => setTopUpOpen(true)}>
          <HiOutlinePlus className="h-4 w-4" /> Nạp tiền
        </Button>
      </Card>

      {list.length === 0 ? (
        <EmptyState title="Bạn chưa có hóa đơn nào" />
      ) : (
        <div className="space-y-4">
          {list.map((inv) => (
            <Card key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-ink">Hóa đơn #{inv.id}</p>
                <p className="text-sm text-ink-faint">{formatDate(inv.createdAt)} · {inv.items.length} khoản mục</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-extrabold font-display text-ink">{formatCurrency(inv.amount)}</span>
                <InvoiceStatusBadge status={inv.status} />
                {inv.status === "unpaid" && (
                  <Button size="sm" onClick={() => setPayTarget(inv)}><HiOutlineCreditCard className="h-4 w-4" /> Thanh toán online</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <PayModal
        invoice={payTarget}
        balance={balance}
        patientId={user.id}
        onClose={() => setPayTarget(null)}
        onRequestTopUp={() => { setPayTarget(null); setTopUpOpen(true); }}
        onSuccess={(newBalance) => { setBalance(newBalance); setPayTarget(null); load(); }}
      />

      <TopUpModal
        open={topUpOpen}
        patientId={user.id}
        onClose={() => setTopUpOpen(false)}
        onSuccess={(newBalance) => { setBalance(newBalance); setTopUpOpen(false); }}
      />
    </div>
  );
}

function PayModal({ invoice, balance, patientId, onClose, onRequestTopUp, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState("form"); // form | success
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
    <Modal open={!!invoice} onClose={onClose} title="Thanh toán trực tuyến" subtitle="Mô phỏng chuyển khoản qua MediPay Wallet" width="max-w-sm">
      {invoice && (
        step === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf-50">
              <HiOutlineCheckCircle className="h-9 w-9 text-leaf-500" />
            </div>
            <p className="text-lg font-bold text-ink">Chuyển khoản thành công!</p>
            <p className="text-sm text-ink-faint">Đã thanh toán {formatCurrency(invoice.amount)} cho hóa đơn #{invoice.id}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl2 border border-slate-100 bg-slate-50/70 p-4 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-ink-faint">Số dư khả dụng</span>
                <span className="font-bold text-ink">{formatCurrency(balance)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-faint">Nội dung</span>
                <span className="font-medium text-ink-soft">Thanh toán HĐ #{invoice.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-faint">Số tiền hóa đơn</span>
                <span className="font-bold text-teal-600">{formatCurrency(invoice.amount)}</span>
              </div>
            </div>

            {insufficient && (
              <div className="rounded-lg bg-clay-50 px-3.5 py-2.5 text-xs text-clay-500">
                <div className="flex items-start gap-2">
                  <HiOutlineExclamation className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Số dư ví hiện không đủ để thanh toán hóa đơn này.</span>
                </div>
                <button type="button" onClick={onRequestTopUp} className="mt-1.5 ml-6 font-semibold text-teal-600 hover:text-teal-700">
                  Nạp tiền vào ví ngay →
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Nhập số tiền cần chuyển khoản</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Nhập số tiền…"
                error={!!error}
              />
              <FieldError>{error}</FieldError>
            </div>

            <Button className="w-full" onClick={handleTransfer} loading={submitting} disabled={insufficient}>
              Xác nhận chuyển khoản
            </Button>
            <p className="text-[11px] text-center text-ink-faint">Giao dịch mô phỏng cho mục đích demo, không phát sinh tiền thật.</p>
          </div>
        )
      )}
    </Modal>
  );
}

function TopUpModal({ open, patientId, onClose, onSuccess }) {
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
      setStep("success");
      toast.success("Nạp tiền vào ví thành công");
      setTimeout(() => onSuccess(res.data.balance), 900);
    } catch (err) {
      setError(err.message || "Nạp tiền thất bại, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nạp tiền vào ví" subtitle="Mô phỏng liên kết tài khoản ngân hàng" width="max-w-sm">
      {step === "success" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf-50">
            <HiOutlineCheckCircle className="h-9 w-9 text-leaf-500" />
          </div>
          <p className="text-lg font-bold text-ink">Nạp tiền thành công!</p>
          <p className="text-sm text-ink-faint">Đã cộng {formatCurrency(Number(amount))} vào ví MediPay Wallet</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Chọn nhanh số tiền</label>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={clsx(
                    "rounded-lg border px-3 py-2 text-sm font-semibold transition",
                    Number(amount) === v ? "border-teal-500 bg-teal-500 text-white" : "border-slate-200 text-ink-soft hover:border-teal-300"
                  )}
                >
                  {formatCurrency(v)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Hoặc nhập số tiền khác</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Nhập số tiền muốn nạp…"
              error={!!error}
            />
            <FieldError>{error}</FieldError>
          </div>

          <Button className="w-full" onClick={handleConfirm} loading={submitting}>
            Xác nhận nạp tiền
          </Button>
          <p className="text-[11px] text-center text-ink-faint">Giao dịch mô phỏng cho mục đích demo, không phát sinh tiền thật.</p>
        </div>
      )}
    </Modal>
  );
}
