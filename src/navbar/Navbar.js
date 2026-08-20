import React from "react";
import TimeTracker from "../components/TimeTracker";

export default function Navbar({ user, onLogout, activeTab, setActiveTab }) {
  return (
    <nav
      className="navbar navbar-expand-lg px-4"
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
      }}
    >
      <div className="container-fluid d-flex flex-wrap align-items-center justify-content-between gap-3">
        {/* Brand */}
        <span className="navbar-brand fw-bold fs-4 text-white">
           DOOM<span style={{ color: "#38bdf8" }}>verse</span>
        </span>

        {/* Navigation Links - Simple plain text like "Courses" and "Streams" */}
        <div className="d-flex align-items-center gap-4">
          <span
            onClick={() => setActiveTab("my-vlogs")}
            style={{
              cursor: "pointer",
              fontWeight: activeTab === "my-vlogs" ? "700" : "500",
              color: activeTab === "my-vlogs" ? "#ffffff" : "rgba(255,255,255,0.5)",
              textDecoration: "none",
              borderBottom: activeTab === "my-vlogs" ? "2px solid #38bdf8" : "2px solid transparent",
              paddingBottom: "4px",
              transition: "color 0.2s ease",
              fontSize: "0.95rem",
            }}
          >
            My Vlogs
          </span>

          <span
            onClick={() => setActiveTab("others-ideas")}
            style={{
              cursor: "pointer",
              fontWeight: activeTab === "others-ideas" ? "700" : "500",
              color: activeTab === "others-ideas" ? "#ffffff" : "rgba(255,255,255,0.5)",
              textDecoration: "none",
              borderBottom: activeTab === "others-ideas" ? "2px solid #38bdf8" : "2px solid transparent",
              paddingBottom: "4px",
              transition: "color 0.2s ease",
              fontSize: "0.95rem",
            }}
          >
            Others' Ideas
          </span>

          <span
            onClick={() => setActiveTab("movies")}
            style={{
              cursor: "pointer",
              fontWeight: activeTab === "movies" ? "700" : "500",
              color: activeTab === "movies" ? "#ffffff" : "rgba(255,255,255,0.5)",
              textDecoration: "none",
              borderBottom: activeTab === "movies" ? "2px solid #ec4899" : "2px solid transparent",
              paddingBottom: "4px",
              transition: "color 0.2s ease",
              fontSize: "0.95rem",
            }}
          >
            🎬 Movies
          </span>

          <span
            onClick={() => setActiveTab("ai-channel")}
            style={{
              cursor: "pointer",
              fontWeight: activeTab === "ai-channel" ? "700" : "500",
              color: activeTab === "ai-channel" ? "#ffffff" : "rgba(255,255,255,0.5)",
              textDecoration: "none",
              borderBottom: activeTab === "ai-channel" ? "2px solid #a78bfa" : "2px solid transparent",
              paddingBottom: "4px",
              transition: "color 0.2s ease",
              fontSize: "0.95rem",
            }}
          >
            Account
          </span>

          {user?.email?.trim().toLowerCase() === "anz026771@gmail.com" && (
            <span
              onClick={() => setActiveTab("admin")}
              style={{
                cursor: "pointer",
                fontWeight: activeTab === "admin" ? "700" : "500",
                color: activeTab === "admin" ? "#f43f5e" : "rgba(244,63,94,0.7)",
                textDecoration: "none",
                borderBottom: activeTab === "admin" ? "2px solid #f43f5e" : "2px solid transparent",
                paddingBottom: "4px",
                transition: "color 0.2s ease",
                fontSize: "0.95rem",
              }}
            >
              🛡️ Admin Panel
            </span>
          )}
        </div>

        {/* User, Time Spent Bar & Logout */}
        <div className="d-flex align-items-center gap-3">
          <TimeTracker user={user} />
          <span className="text-light small">
            {user?.email || "Student"}
          </span>
          <button
            onClick={onLogout}
            className="btn btn-sm btn-outline-danger px-3"
            style={{ borderRadius: "6px" }}
          >
            Log Out
          </button>
        </div>
      </div>
    </nav>
  );
}
