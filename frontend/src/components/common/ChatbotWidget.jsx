import { useEffect, useRef, useState } from "react";
import { HiOutlineChatAlt2, HiOutlineX, HiOutlinePaperAirplane, HiOutlineSparkles } from "react-icons/hi";
import clsx from "clsx";
import { chatbotService } from "../../services/commonService";
import { useAuth } from "../../context/AuthContext";

const SUGGESTIONS = [
  "Phòng khám có những chuyên khoa nào?",
  "Bác sĩ tim mạch là ai?",
  "Lịch hẹn sắp tới của tôi?",
];

export default function ChatbotWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Xin chào! Tôi là trợ lý ảo MediCare, chạy trên mô hình AI local (Ollama). Tôi có thể giúp gì cho bạn?" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text) {
    const value = (text ?? input).trim();
    if (!value || sending) return;
    setMessages((m) => [...m, { from: "user", text: value }]);
    setInput("");
    setSending(true);
    try {
      const res = await chatbotService.sendMessage({ message: value, role: user?.role, userId: user?.id });
      setMessages((m) => [...m, { from: "bot", text: res.data.reply }]);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Xin lỗi, hệ thống trợ lý đang gặp sự cố. Vui lòng thử lại." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-pop transition-transform hover:scale-105",
          open ? "bg-ink text-white" : "bg-teal-500 text-white"
        )}
        aria-label="Trợ lý ảo"
      >
        {open ? <HiOutlineX className="h-6 w-6" /> : <HiOutlineChatAlt2 className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[min(560px,70vh)] w-[min(380px,90vw)] flex-col overflow-hidden rounded-xl2 border border-slate-100 bg-white shadow-pop animate-slide-up">
          <div className="flex items-center gap-2.5 bg-teal-700 px-4 py-3.5 text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500">
              <HiOutlineSparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold font-display">Trợ lý MediCare AI</p>
              <p className="text-[11px] text-teal-100">Được hỗ trợ bởi mô hình AI cục bộ</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin bg-slate-50/60 px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={clsx("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={clsx(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.from === "user" ? "bg-teal-500 text-white rounded-br-sm" : "bg-white border border-slate-100 text-ink rounded-bl-sm"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-3.5 py-2.5 text-sm text-ink-faint">
                  Đang soạn trả lời…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length < 3 && (
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-3 py-2.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-ink-soft hover:border-teal-300 hover:text-teal-600"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 border-t border-slate-100 bg-white px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của bạn…"
              className="flex-1 rounded-full border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-teal-400"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-white disabled:bg-slate-200"
            >
              <HiOutlinePaperAirplane className="h-4 w-4 rotate-90" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
