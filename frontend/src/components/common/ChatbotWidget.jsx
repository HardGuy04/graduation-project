import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HiOutlineChatAlt2, HiOutlineX, HiOutlinePaperAirplane, HiOutlineSparkles } from "react-icons/hi";
import { Button } from "@/components/kit/button";
import { cn } from "@/lib/utils";
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
      <Button
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng trợ lý ảo" : "Mở trợ lý ảo"}
        aria-expanded={open}
        aria-controls="medicare-chat"
        className="fixed bottom-5 right-5 z-40 h-14 w-14 shadow-float [&_svg]:size-6"
      >
        {open ? <HiOutlineX /> : <HiOutlineChatAlt2 />}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.section
            id="medicare-chat"
            aria-label="Trợ lý MediCare AI"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="auralis fixed bottom-24 right-5 z-40 flex h-[min(560px,70vh)] w-[min(380px,calc(100vw-2.5rem))] origin-bottom-right flex-col overflow-hidden rounded-card border border-border bg-card shadow-float"
          >
            <div className="flex items-center gap-3 bg-primary px-5 py-4 text-primary-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <HiOutlineSparkles aria-hidden className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Trợ lý MediCare AI</p>
                <p className="text-[11px] text-primary-foreground/70">Được hỗ trợ bởi mô hình AI cục bộ</p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin bg-background px-4 py-4" aria-live="polite">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-[18px] px-4 py-2.5 text-sm leading-relaxed",
                      m.from === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card text-foreground"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-[18px] rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                    Đang soạn trả lời…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {messages.length < 3 && (
              <div className="flex flex-wrap gap-1.5 border-t border-border bg-card px-3 py-2.5">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} variant="outline" size="sm" onClick={() => send(s)} className="h-auto min-h-11 whitespace-normal py-2 text-left text-xs font-medium">
                    {s}
                  </Button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-center gap-2 border-t border-border bg-card px-3 py-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Nhập câu hỏi của bạn…"
                aria-label="Câu hỏi cho trợ lý"
                className="min-h-11 flex-1 rounded-full border border-input bg-card px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-foreground"
              />
              <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Gửi">
                <HiOutlinePaperAirplane className="rotate-90" />
              </Button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
