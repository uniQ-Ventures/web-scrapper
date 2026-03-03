"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: string;
  timestamp: Date;
}

export default function BookkeeperPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Hi! I'm your AI Bookkeeper. I can help you:\n\n• **Log expenses** — \"Log ₹5000 for AWS\"\n• **Query spending** — \"How much did I spend on rent?\"\n• **Check revenue** — \"Revenue this month\"\n• **Create invoices** — \"Create invoice for ₹50000 to Acme\"\n• **Get summaries** — \"Summary\"\n\nWhat would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/bookkeeper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: userMsg.content }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.response || data.error || "Something went wrong",
        action: data.action,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "❌ Failed to process. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  const ACTION_COLORS: Record<string, string> = {
    expense_created: "#22C55E",
    invoice_created: "#6366F1",
    query: "#F59E0B",
    summary: "#818CF8",
    help: "#64748B",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><Bot size={24} /> AI Bookkeeper</h2>
        <p>Natural language commands for your finances</p>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "0 4px", display: "flex", flexDirection: "column", gap: 16,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", gap: 12,
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: msg.role === "user" ? "rgba(99,102,241,0.15)" : "rgba(34,197,94,0.15)",
            }}>
              {msg.role === "user" ? <User size={16} color="#818CF8" /> : <Bot size={16} color="#22C55E" />}
            </div>
            <div style={{
              maxWidth: "70%", padding: "12px 16px", borderRadius: 12,
              background: msg.role === "user" ? "rgba(99,102,241,0.1)" : "var(--bg-card)",
              border: `1px solid ${msg.role === "user" ? "rgba(99,102,241,0.2)" : "var(--border-color)"}`,
              borderTopRightRadius: msg.role === "user" ? 4 : 12,
              borderTopLeftRadius: msg.role === "user" ? 12 : 4,
            }}>
              <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}
                dangerouslySetInnerHTML={{
                  __html: msg.content
                    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n/g, "<br>"),
                }}
              />
              {msg.action && (
                <div style={{ marginTop: 8 }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: `${ACTION_COLORS[msg.action] || "#666"}22`,
                    color: ACTION_COLORS[msg.action] || "#666",
                  }}>
                    {msg.action.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              )}
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 4 }}>
                {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(34,197,94,0.15)" }}>
              <Loader2 size={16} color="#22C55E" className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0, padding: "16px 0 0", borderTop: "1px solid var(--border-color)", marginTop: 16,
      }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder='Try "Log ₹5000 for AWS" or "Summary"...'
            style={{ flex: 1, fontSize: 14, padding: "12px 16px" }}
          />
          <button
            className="btn btn-primary"
            onClick={send}
            disabled={!input.trim() || loading}
            style={{ padding: "12px 20px" }}
          >
            <Send size={16} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {["Summary", "Revenue this month", "Log ₹5000 for AWS", "How much did I spend on rent?"].map((cmd) => (
            <button
              key={cmd}
              onClick={() => { setInput(cmd); }}
              style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)",
                color: "#818CF8", fontWeight: 500,
              }}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
