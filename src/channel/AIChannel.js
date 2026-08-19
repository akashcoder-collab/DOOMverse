import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

export default function AIChannel({ creatorEmail, currentUser, onBack }) {
  const [vlogs, setVlogs] = useState([]);
  const [loadingVlogs, setLoadingVlogs] = useState(true);

  // Personal Info state
  const [profile, setProfile] = useState({
    fullName: "",
    university: "",
    hobbies: "",
    bio: "",
    email: creatorEmail,
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editUniversity, setEditUniversity] = useState("");
  const [editHobbies, setEditHobbies] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const creatorName = creatorEmail.split("@")[0];
  const isSelf = currentUser?.email?.trim().toLowerCase() === creatorEmail?.trim().toLowerCase();

  // Fetch creator's vlogs
  useEffect(() => {
    const fetchUserVlogs = async () => {
      try {
        setLoadingVlogs(true);
        const res = await fetch(
          `${API_BASE_URL}/user-vlogs?email=${encodeURIComponent(creatorEmail)}`
        );
        const data = await res.json();
        if (res.ok) {
          setVlogs(data.vlogs || []);
        }
      } catch (err) {
        console.error("Error fetching user vlogs:", err);
      } finally {
        setLoadingVlogs(false);
      }
    };

    fetchUserVlogs();
  }, [creatorEmail]);

  // Activity state
  const [activity, setActivity] = useState({ secondsSpent: 0, isToday: true });

  // Fetch profile & activity
  useEffect(() => {
    const fetchProfileAndActivity = async () => {
      try {
        setLoadingProfile(true);
        const [profRes, actRes] = await Promise.all([
          fetch(`${API_BASE_URL}/profile?email=${encodeURIComponent(creatorEmail)}`),
          fetch(`${API_BASE_URL}/activity?email=${encodeURIComponent(creatorEmail)}`),
        ]);

        const profData = await profRes.json();
        if (profRes.ok && profData.profile) {
          setProfile(profData.profile);
          setEditFullName(profData.profile.fullName || "");
          setEditUniversity(profData.profile.university || "");
          setEditHobbies(profData.profile.hobbies || "");
          setEditBio(profData.profile.bio || "");
        }

        const actData = await actRes.json();
        if (actRes.ok && actData.activity) {
          setActivity(actData.activity);
        }
      } catch (err) {
        console.error("Error fetching profile or activity:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfileAndActivity();
  }, [creatorEmail]);

  // Save updated profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: creatorEmail,
          fullName: editFullName,
          university: editUniversity,
          hobbies: editHobbies,
          bio: editBio,
        }),
      });

      if (res.ok) {
        setProfile({
          email: creatorEmail,
          fullName: editFullName,
          university: editUniversity,
          hobbies: editHobbies,
          bio: editBio,
        });
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#080d1a",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          padding: "14px 24px",
          backgroundColor: "rgba(15, 23, 42, 0.97)",
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4f46e5, #ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "1.1rem",
              color: "#fff",
            }}
          >
            {creatorName[0].toUpperCase()}
          </div>
          <div>
            <h5 className="mb-0 fw-bold" style={{ color: "#fff" }}>
              {creatorName}'s Account & Profile
            </h5>
            <small style={{ color: "#38bdf8" }}>
              {loadingVlogs ? "Loading..." : `${vlogs.length} vlogs`} · Personal Information
            </small>
          </div>
        </div>
      </div>

      {/* Main Split: Left Vlogs (40%) + Right Personal Information (60%) */}
      <div className="account-split-container" style={{ display: "flex", flex: 1, height: "calc(100vh - 58px)", overflow: "hidden" }}>
        {/* Left: Creator Vlogs */}
        <div
          className="account-split-left"
          style={{
            flex: "0 0 40%",
            overflowY: "auto",
            padding: "20px",
            borderRight: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Creator Header Card */}
          <div
            style={{
              padding: "20px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, rgba(79,70,229,0.25), rgba(236,72,153,0.25))",
              border: "1px solid rgba(255,255,255,0.12)",
              marginBottom: "20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4f46e5, #ec4899)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                fontWeight: "bold",
                margin: "0 auto 12px auto",
              }}
            >
              {creatorName[0].toUpperCase()}
            </div>
            <h4 className="fw-bold mb-1">{profile.fullName || creatorName}</h4>
            <small style={{ color: "rgba(255,255,255,0.5)" }}>{creatorEmail}</small>
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                justifyContent: "center",
                gap: "20px",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold", fontSize: "1.2rem", color: "#38bdf8" }}>
                  {vlogs.length}
                </div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Total Vlogs</div>
              </div>
            </div>
          </div>

          {/* Vlogs List */}
          <h6
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            Vlogs & Content
          </h6>

          {loadingVlogs ? (
            <div className="text-center py-4">
              <div className="spinner-border text-info spinner-border-sm"></div>
              <p className="mt-2" style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>
                Loading vlogs...
              </p>
            </div>
          ) : vlogs.length === 0 ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                color: "rgba(255,255,255,0.4)",
                borderRadius: "10px",
                border: "1px dashed rgba(255,255,255,0.1)",
                fontSize: "0.9rem",
              }}
            >
              No vlogs posted yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {vlogs.map((vlog) => (
                <div
                  key={vlog.id}
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontWeight: "600", fontSize: "0.9rem", marginBottom: "4px" }}>
                    {vlog.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "rgba(255,255,255,0.5)",
                      marginBottom: "6px",
                    }}
                  >
                    {vlog.description}
                  </div>
                  <small style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.72rem" }}>
                    {vlog.date}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Personal Information Section */}
        <div
          className="account-split-right"
          style={{
            flex: "0 0 60%",
            overflowY: "auto",
            padding: "28px",
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom border-secondary-subtle">
            <div>
              <h4 className="fw-bold mb-1" style={{ color: "#fff" }}>
                📋 Personal Information
              </h4>
              <p className="small mb-0" style={{ color: "rgba(255,255,255,0.5)" }}>
                User details, university, and personal interests
              </p>
            </div>
            {isSelf && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-sm btn-outline-info px-3"
                style={{ borderRadius: "8px" }}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>

          {loadingProfile ? (
            <div className="text-center py-5">
              <div className="spinner-border text-info" role="status"></div>
              <p className="mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>Loading personal info...</p>
            </div>
          ) : isEditing ? (
            /* Edit Form */
            <form onSubmit={handleSaveProfile} className="d-flex flex-column gap-3">
              <div>
                <label className="form-label text-light small fw-semibold">Full Name</label>
                <input
                  type="text"
                  className="form-control glass-input"
                  placeholder="e.g. John Doe"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#fff" }}
                />
              </div>

              <div>
                <label className="form-label text-light small fw-semibold">University / Institution</label>
                <input
                  type="text"
                  className="form-control glass-input"
                  placeholder="e.g. Stanford University"
                  value={editUniversity}
                  onChange={(e) => setEditUniversity(e.target.value)}
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#fff" }}
                />
              </div>

              <div>
                <label className="form-label text-light small fw-semibold">Hobbies & Interests</label>
                <input
                  type="text"
                  className="form-control glass-input"
                  placeholder="e.g. Coding, Gaming, Video Editing"
                  value={editHobbies}
                  onChange={(e) => setEditHobbies(e.target.value)}
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#fff" }}
                />
              </div>

              <div>
                <label className="form-label text-light small fw-semibold">Bio / About Me</label>
                <textarea
                  className="form-control glass-input"
                  rows="3"
                  placeholder="Tell others a bit about yourself..."
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#fff" }}
                ></textarea>
              </div>

              <div className="d-flex gap-2 mt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn btn-primary px-4"
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary px-3"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* View Personal Information Cards */
            <div className="d-flex flex-column gap-3">
              {/* Daily Activity & Screen Time Card */}
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(56, 189, 248, 0.15))",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700", marginBottom: "4px" }}>
                  ⏱️ Daily Activity & Screen Time
                </div>
                <div className="d-flex align-items-center justify-content-between mt-1">
                  <div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#ffffff", fontFamily: "monospace" }}>
                      {(() => {
                        let sec = activity.secondsSpent || 0;
                        if (isSelf) {
                          const today = new Date().toISOString().split("T")[0];
                          const saved = localStorage.getItem(`edustream_time_${creatorEmail}_${today}`);
                          if (saved) sec = Math.max(sec, parseInt(saved, 10) || 0);
                        }
                        const hrs = Math.floor(sec / 3600);
                        const mins = Math.floor((sec % 3600) / 60);
                        const s = sec % 60;
                        if (hrs > 0) return `${hrs}h ${mins}m ${s}s`;
                        if (mins > 0) return `${mins}m ${s}s`;
                        return `${s}s`;
                      })()}
                    </div>
                    <small style={{ color: "rgba(255,255,255,0.5)" }}>Spent on DOOMverse today</small>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        backgroundColor: (isSelf || activity.isToday) ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.1)",
                        color: (isSelf || activity.isToday) ? "#10b981" : "rgba(255,255,255,0.5)",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: (isSelf || activity.isToday) ? "#10b981" : "#888",
                        }}
                      />
                      {isSelf ? "Online Now" : activity.isToday ? "Active Today" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "600", marginBottom: "4px" }}>
                  Full Name
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: "600", color: "#ffffff" }}>
                  {profile.fullName || creatorName}
                </div>
              </div>

              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "600", marginBottom: "4px" }}>
                  Email Address
                </div>
                <div style={{ fontSize: "0.98rem", color: "rgba(255,255,255,0.85)" }}>
                  {creatorEmail}
                </div>
              </div>

              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "600", marginBottom: "4px" }}>
                  🎓 University / Institution
                </div>
                <div style={{ fontSize: "0.98rem", color: profile.university && profile.university !== "Not set yet" ? "#ffffff" : "rgba(255,255,255,0.4)" }}>
                  {profile.university || "Not specified yet"}
                </div>
              </div>

              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "600", marginBottom: "4px" }}>
                  ⚽ Hobbies & Interests
                </div>
                <div style={{ fontSize: "0.98rem", color: profile.hobbies && profile.hobbies !== "Not set yet" ? "#ffffff" : "rgba(255,255,255,0.4)" }}>
                  {profile.hobbies || "Not specified yet"}
                </div>
              </div>

              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "600", marginBottom: "4px" }}>
                  📝 Bio / About Me
                </div>
                <div style={{ fontSize: "0.92rem", color: "rgba(255,255,255,0.8)", lineHeight: "1.5" }}>
                  {profile.bio || "No bio added yet."}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
