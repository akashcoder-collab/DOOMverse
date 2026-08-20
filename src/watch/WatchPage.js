import React, { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "../config";

export default function WatchPage({ vlog, user, onBack }) {
  const hasVideo = Boolean(vlog?.videoUrl && vlog.videoUrl.trim());
  const hasImage = Boolean(vlog?.imageUrl && vlog.imageUrl.trim());
  const authorName = vlog?.author ? vlog.author.split("@")[0] : "Creator";

  const greeting = {
    role: "assistant",
    text: `Hi! I'm your AI assistant. You're viewing "${vlog?.title || "Vlog"}" by ${authorName}. Ask me anything about this ${hasVideo ? "video" : hasImage ? "image post" : "idea"}!`,
  };

  const [messages, setMessages] = useState([greeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chat history from Telegram on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/load-chat?email=${encodeURIComponent(user?.email || "")}&vlogId=${vlog.id}`
        );
        const data = await res.json();
        if (res.ok && data.history && data.history.length > 0) {
          // Rebuild messages from stored history
          const rebuilt = [greeting];
          data.history.forEach((entry) => {
            rebuilt.push({ role: "user",      text: entry.user });
            rebuilt.push({ role: "assistant", text: entry.ai });
          });
          setMessages(rebuilt);
        }
      } catch (err) {
        console.warn("Could not load chat history:", err);
      }
    };
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vlog.id, user?.email]);

  // Get YouTube embed URL
  const getEmbedUrl = (url) => {
    if (!url) return "";
    const params = "?rel=0&modestbranding=1&playsinline=1";
    try {
      if (url.includes("youtu.be/")) {
        const id = url.split("youtu.be/")[1].split("?")[0];
        return `https://www.youtube.com/embed/${id}${params}`;
      }
      if (url.includes("youtube.com/watch")) {
        const urlObj = new URL(url);
        const id = urlObj.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}${params}`;
      }
      if (url.includes("youtube.com/embed/")) {
        const base = url.split("?")[0];
        return `${base}${params}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  // Get resolved image URL
  const getImageUrl = (url) => {
    if (!url) return "";
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    ) {
      return url;
    }
    return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  // Send message to Groq via Flask /chat + save to Telegram
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          context: `The user is viewing a ${hasVideo ? "video vlog" : hasImage ? "photo/image vlog" : "idea post"} titled "${vlog.title}" described as: "${vlog.description || ""}". Posted by ${vlog.author}.`,
        }),
      });

      const data = await res.json();
      const aiReply = data.reply || "Sorry, I couldn't respond.";

      setMessages((prev) => [...prev, { role: "assistant", text: aiReply }]);

      // Save this exchange to Telegram Database
      fetch(`${API_BASE_URL}/save-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:       user?.email || "anonymous",
          vlogId:      vlog.id,
          userMessage: trimmed,
          aiReply:     aiReply,
        }),
      }).catch(() => {}); // Fire-and-forget, don't block UI

    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0f1e",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          padding: "12px 24px",
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            borderRadius: "8px",
            padding: "6px 16px",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          ← Back
        </button>
        <div>
          <h5 className="mb-0 fw-bold" style={{ color: "#fff" }}>{vlog.title}</h5>
          <small style={{ color: "rgba(255,255,255,0.5)" }}>
            by {authorName} · {vlog.date}
          </small>
        </div>
      </div>

      {/* Main Content: Media Left + Chat Right */}
      <div
        className="watch-split-container"
        style={{
          display: "flex",
          flex: 1,
          height: "calc(100vh - 57px)",
          overflow: "hidden",
        }}
      >
        {/* Left: Video / Image / Idea Presentation */}
        <div
          className="watch-split-left"
          style={{
            flex: "0 0 65%",
            backgroundColor: "#050811",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            position: "relative",
          }}
        >
          {hasVideo ? (
            /* Video player */
            <div style={{ width: "100%", height: "100%", minHeight: "450px" }}>
              <iframe
                src={getEmbedUrl(vlog.videoUrl)}
                title={vlog.title}
                style={{ width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                playsInline
              ></iframe>
            </div>
          ) : hasImage ? (
            /* Image showcase view */
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px",
                backgroundColor: "#080c16",
              }}
            >
              <div
                style={{
                  maxWidth: "90%",
                  maxHeight: "68vh",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  backgroundColor: "#000",
                }}
              >
                <img
                  src={getImageUrl(vlog.imageUrl)}
                  alt={vlog.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    maxHeight: "68vh",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>

              {/* Title & Description Below Image */}
              <div
                style={{
                  marginTop: "20px",
                  maxWidth: "90%",
                  textAlign: "center",
                  padding: "16px 24px",
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <h4 className="fw-bold text-white mb-2">{vlog.title}</h4>
                <p className="text-light-50 mb-0" style={{ fontSize: "0.95rem" }}>
                  {vlog.description || "No description provided."}
                </p>
              </div>
            </div>
          ) : (
            /* Idea / Text note view */
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px",
                background: "linear-gradient(135deg, #090e1d, #111a33)",
              }}
            >
              <div
                style={{
                  maxWidth: "680px",
                  width: "100%",
                  backgroundColor: "rgba(15, 23, 42, 0.8)",
                  backdropFilter: "blur(14px)",
                  borderRadius: "20px",
                  padding: "36px",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                }}
              >
                <div className="d-flex align-items-center gap-2 mb-3">
                  <span className="badge bg-purple px-3 py-2" style={{ backgroundColor: "#8b5cf6", fontSize: "0.85rem" }}>
                    💡 Community Idea / Post
                  </span>
                  <small style={{ color: "rgba(255,255,255,0.5)" }}>{vlog.date}</small>
                </div>
                <h2 className="fw-bold text-white mb-3">{vlog.title}</h2>
                <p
                  style={{
                    color: "rgba(255,255,255,0.85)",
                    fontSize: "1.05rem",
                    lineHeight: "1.7",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {vlog.description || "No description provided for this idea."}
                </p>
                <hr style={{ borderColor: "rgba(255,255,255,0.15)", margin: "24px 0 16px 0" }} />
                <div className="d-flex align-items-center justify-content-between">
                  <small style={{ color: "#38bdf8" }}>Posted by {authorName}</small>
                  <small style={{ color: "rgba(255,255,255,0.4)" }}>Ask the AI assistant on the right 💬</small>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: AI Chatbot */}
        <div
          className="watch-split-right"
          style={{
            flex: "0 0 35%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "rgba(15, 23, 42, 0.97)",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {/* Chat Header */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4f46e5, #ec4899)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
              }}
            >
              AI
            </div>
            <div>
              <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>AI Assistant</div>
              <div style={{ fontSize: "0.75rem", color: "#38bdf8" }}>● Online · Powered by Groq</div>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    backgroundColor:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                        : "rgba(255,255,255,0.07)",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                        : "rgba(255,255,255,0.07)",
                    border:
                      msg.role === "user"
                        ? "none"
                        : "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontSize: "0.88rem",
                    lineHeight: "1.5",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "16px 16px 16px 4px",
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.88rem",
                  }}
                >
                  Thinking...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this video..."
              className="glass-input"
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "0.88rem",
                outline: "none",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: "linear-gradient(135deg, #4f46e5, #ec4899)",
                border: "none",
                color: "#fff",
                borderRadius: "10px",
                padding: "10px 18px",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading || !input.trim() ? 0.5 : 1,
                fontWeight: "600",
                fontSize: "0.88rem",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
