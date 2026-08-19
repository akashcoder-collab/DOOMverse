import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

export default function TimeTracker({ user }) {
  const [seconds, setSeconds] = useState(0);

  const getTodayKey = () => {
    const today = new Date().toISOString().split("T")[0];
    const email = user?.email || "anonymous";
    return `edustream_time_${email}_${today}`;
  };

  useEffect(() => {
    const key = getTodayKey();
    const saved = localStorage.getItem(key);
    const initialSeconds = saved ? parseInt(saved, 10) || 0 : 0;
    setSeconds(initialSeconds);

    const timer = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        localStorage.setItem(key, next.toString());

        // Sync to backend every 5 seconds
        if (next % 5 === 0 && user?.email) {
          fetch(`${API_BASE_URL}/activity`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              secondsSpent: next,
            }),
          }).catch(() => {});
        }

        return next;
      });
    }, 1000);

    // Initial immediate sync on mount
    if (user?.email) {
      fetch(`${API_BASE_URL}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          secondsSpent: Math.max(1, initialSeconds),
        }),
      }).catch(() => {});
    }

    return () => clearInterval(timer);
  }, [user?.email]);

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Soft daily goal of 2 hours (7200 seconds) for progress bar visualization
  const maxGoal = 7200;
  const progressPercent = Math.min(100, Math.round((seconds / maxGoal) * 100));

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "5px 14px",
        borderRadius: "20px",
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(8px)",
      }}
      title="Time spent on DOOMverse today"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#10b981",
            boxShadow: "0 0 8px #10b981",
            display: "inline-block",
          }}
        />
        <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", fontWeight: "500" }}>
          Today:
        </span>
        <span style={{ fontSize: "0.85rem", color: "#38bdf8", fontWeight: "700", fontFamily: "monospace" }}>
          {formatTime(seconds)}
        </span>
      </div>

      {/* Mini Progress Bar */}
      <div
        style={{
          width: "60px",
          height: "5px",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(5, progressPercent)}%`,
            height: "100%",
            background: "linear-gradient(90deg, #38bdf8, #818cf8)",
            borderRadius: "3px",
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}
