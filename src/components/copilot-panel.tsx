"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  "What's my runway?",
  "Show overdue invoices",
  "How much did we spend this month?",
  "Revenue by client",
  "Financial health check",
  "Cash flow projection",
];

export default function CopilotPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey! I'm your Finance copilot. Ask me about runway, invoices, expenses, revenue, or financial health.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.response || data.error || "Sorry, I couldn't process that.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: "Something went wrong. Please try again.",
          timestamp: new Date(),
        },
      ]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMarkdown = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/⚠️/g, '<span class="copilot-warning">⚠️</span>')
      .replace(/\n/g, "<br />");
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        className="copilot-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Finance Copilot"
      >
        {isOpen ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {/* Panel */}
      <div className={`copilot-panel ${isOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="copilot-header">
          <div className="copilot-header-left">
            <div className="copilot-avatar">
              <Sparkles size={16} />
            </div>
            <div>
              <h3>Finance Copilot</h3>
              <span>Powered by your data</span>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => setIsOpen(false)}
            style={{ padding: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="copilot-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`copilot-msg ${msg.role}`}
            >
              {msg.role === "assistant" && (
                <div className="copilot-msg-avatar">
                  <Sparkles size={12} />
                </div>
              )}
              <div className="copilot-msg-bubble">
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(msg.content),
                  }}
                />
              </div>
            </div>
          ))}
          {loading && (
            <div className="copilot-msg assistant">
              <div className="copilot-msg-avatar">
                <Sparkles size={12} />
              </div>
              <div className="copilot-msg-bubble copilot-typing">
                <Loader2 size={14} className="loading" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="copilot-suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="copilot-suggestion"
                onClick={() => sendMessage(s)}
              >
                <MessageCircle size={12} />
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="copilot-input-bar">
          <input
            ref={inputRef}
            className="copilot-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances..."
            disabled={loading}
          />
          <button
            className="copilot-send"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
