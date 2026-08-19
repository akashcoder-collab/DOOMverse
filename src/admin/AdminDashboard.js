import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

export default function AdminDashboard({ adminUser, onSelectUser, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE_URL}/admin/users?email=${encodeURIComponent(adminUser?.email || "")}`
        );
        const data = await res.json();
        if (res.ok) {
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Error fetching admin users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [adminUser?.email]);

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const totalUsers = users.length;
  const activeTodayCount = users.filter((u) => u.isToday || u.secondsSpentToday > 0).length;
  const totalVlogsCount = users.reduce((acc, u) => acc + (u.totalVlogs || 0), 0);

  return (
    <div className="container py-4" style={{ color: "#ffffff" }}>
      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom border-secondary-subtle">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: "#38bdf8" }}>
            🛡️ Admin Control Panel
          </h2>
          <p className="text-light-50 small mb-0">
            Registered user management, platform vlogs, and live screen time statistics
          </p>
        </div>
        <button
          onClick={onBack}
          className="btn btn-outline-light btn-sm px-3"
          style={{ borderRadius: "8px" }}
        >
          ← Back to App
        </button>
      </div>

      {/* Stats Row */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div
            className="p-3 rounded-4"
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ fontSize: "0.78rem", color: "#38bdf8", textTransform: "uppercase", fontWeight: "600" }}>
              Total Registered Users
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold", marginTop: "4px" }}>
              {totalUsers}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div
            className="p-3 rounded-4"
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ fontSize: "0.78rem", color: "#10b981", textTransform: "uppercase", fontWeight: "600" }}>
              Active Today
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold", marginTop: "4px" }}>
              {activeTodayCount}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div
            className="p-3 rounded-4"
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              border: "1px solid rgba(167, 139, 250, 0.3)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ fontSize: "0.78rem", color: "#a78bfa", textTransform: "uppercase", fontWeight: "600" }}>
              Total Vlogs Posted
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold", marginTop: "4px" }}>
              {totalVlogsCount}
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-info" role="status"></div>
          <p className="mt-2 text-light-50">Loading registered users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-5 p-4 rounded-4" style={{ backgroundColor: "rgba(15,23,42,0.6)" }}>
          <p className="text-light-50">No users found.</p>
        </div>
      ) : (
        <div
          className="rounded-4 overflow-hidden shadow"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          <div className="table-responsive">
            <table className="table table-dark table-hover mb-0 align-middle">
              <thead style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                <tr>
                  <th scope="col">User Email</th>
                  <th scope="col">Registration Date</th>
                  <th scope="col">Vlogs Posted</th>
                  <th scope="col">Screen Time Today</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isOnline = u.isToday || u.secondsSpentToday > 0;
                  return (
                    <tr key={u.email}>
                      <td className="fw-semibold">{u.email}</td>
                      <td style={{ color: "rgba(255,255,255,0.6)" }}>{u.registeredDate || "N/A"}</td>
                      <td>
                        <span className="badge bg-primary rounded-pill px-3">
                          {u.totalVlogs} vlogs
                        </span>
                      </td>
                      <td style={{ fontFamily: "monospace", color: "#38bdf8" }}>
                        {formatTime(u.secondsSpentToday || 0)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            isOnline ? "bg-success" : "bg-secondary"
                          } rounded-pill px-3`}
                        >
                          {isOnline ? "Active Today" : "Offline"}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          onClick={() => onSelectUser(u.email)}
                          className="btn btn-sm btn-outline-info"
                          style={{ borderRadius: "6px" }}
                        >
                          View Account →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
