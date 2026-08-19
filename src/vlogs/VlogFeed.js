import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

export default function VlogFeed({ user, activeTab, onWatch, onChannelOpen }) {
  const [vlogs, setVlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [posting, setPosting] = useState(false);

  // Fetch vlogs from Telegram via Flask
  const fetchVlogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/vlogs`);
      const data = await res.json();
      if (res.ok) {
        setVlogs(data.vlogs || []);
      }
    } catch (err) {
      console.error("Error fetching vlogs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVlogs();
  }, []);

  const [editingVlog, setEditingVlog] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updating, setUpdating] = useState(false);

  // Post new vlog to Telegram
  const handlePostVlog = async (e) => {
    e.preventDefault();
    setPosting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/vlogs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          videoUrl,
          description,
          author: user?.email || "Anonymous",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTitle("");
        setVideoUrl("");
        setDescription("");
        setShowForm(false);
        fetchVlogs();
      }
    } catch (err) {
      console.error("Error posting vlog:", err);
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (vlog) => {
    setEditingVlog(vlog);
    setEditTitle(vlog.title || "");
    setEditVideoUrl(vlog.videoUrl || "");
    setEditDescription(vlog.description || "");
  };

  const handleUpdateVlog = async (e) => {
    e.preventDefault();
    if (!editingVlog) return;
    setUpdating(true);

    try {
      const res = await fetch(`${API_BASE_URL}/vlogs/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingVlog.id,
          title: editTitle,
          videoUrl: editVideoUrl,
          description: editDescription,
          author: user?.email || editingVlog.author || "Anonymous",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingVlog(null);
        fetchVlogs();
      }
    } catch (err) {
      console.error("Error updating vlog:", err);
    } finally {
      setUpdating(false);
    }
  };

  // Extract YouTube video info (ID + thumbnail + watch link)
  const getVideoInfo = (url) => {
    try {
      let videoId = null;

      if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1].split("?")[0];
      } else if (url.includes("youtube.com/watch")) {
        const urlObj = new URL(url);
        videoId = urlObj.searchParams.get("v");
      } else if (url.includes("youtube.com/embed/")) {
        videoId = url.split("youtube.com/embed/")[1].split("?")[0];
      }

      if (videoId) {
        return {
          isYoutube: true,
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        };
      }

      // Not a YouTube URL — return the raw URL
      return { isYoutube: false, watchUrl: url, thumbnail: null };
    } catch {
      return { isYoutube: false, watchUrl: url, thumbnail: null };
    }
  };

  // Filter vlogs based on active tab
  const displayedVlogs =
    activeTab === "my-vlogs"
      ? vlogs.filter(
          (vlog) =>
            vlog.author?.trim().toLowerCase() ===
            user?.email?.trim().toLowerCase()
        )
      : vlogs.filter(
          (vlog) =>
            vlog.author?.trim().toLowerCase() !==
            user?.email?.trim().toLowerCase()
        );

  return (
    <div className="container py-4">
      {/* Header & Post Button */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom border-secondary-subtle">
        <div>
          <h2 className="fw-bold mb-1">
            {activeTab === "my-vlogs" ? " My Vlogs & Ideas" : " Others' Ideas & Vlogs"}
          </h2>
          <p className="text-light-50 small mb-0">
            {activeTab === "my-vlogs"
              ? "Your personal creations and ideas"
              : "Ideas shared by other creators in the community"}
          </p>
        </div>

        {activeTab === "my-vlogs" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary fw-semibold px-4"
            style={{
              background: "linear-gradient(135deg, #4f46e5, #ec4899)",
              border: "none",
              borderRadius: "8px",
            }}
          >
            {showForm ? "✕ Cancel" : "+ Upload / Post Vlog"}
          </button>
        )}
      </div>

      {/* Post Vlog Form Modal/Card */}
      {showForm && activeTab === "my-vlogs" && (
        <div
          className="p-4 rounded-4 mb-4"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <h4 className="fw-bold mb-3">Post New Vlog</h4>
          <form onSubmit={handlePostVlog}>
            <div className="mb-3">
              <label className="form-label text-light small">Vlog Title</label>
              <input
                type="text"
                className="form-control glass-input"
                placeholder="e.g. My First Tech Vlog"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-light small">
                Video / Stream URL (YouTube, MP4, or Stream Link)
              </label>
              <input
                type="url"
                className="form-control glass-input"
                placeholder="https://..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                required
                style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-light small">Description</label>
              <textarea
                className="form-control glass-input"
                rows="2"
                placeholder="What is this vlog/idea about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}
              ></textarea>
            </div>
            <button type="submit" disabled={posting} className="btn btn-success px-4">
              {posting ? "Publishing..." : "Publish Vlog"}
            </button>
          </form>
        </div>
      )}

      {/* Edit Vlog Form Modal/Card */}
      {editingVlog && (
        <div
          className="p-4 rounded-4 mb-4"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold mb-0">✏️ Edit Vlog</h4>
            <button
              onClick={() => setEditingVlog(null)}
              className="btn btn-sm btn-outline-light"
            >
              ✕ Cancel
            </button>
          </div>
          <form onSubmit={handleUpdateVlog}>
            <div className="mb-3">
              <label className="form-label text-light small">Vlog Title</label>
              <input
                type="text"
                className="form-control glass-input"
                placeholder="e.g. Updated Vlog Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-light small">
                Video / Stream URL (YouTube, MP4, or Stream Link)
              </label>
              <input
                type="url"
                className="form-control glass-input"
                placeholder="https://www.youtube.com/watch?v=..."
                value={editVideoUrl}
                onChange={(e) => setEditVideoUrl(e.target.value)}
                required
                style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-light small">Description</label>
              <textarea
                className="form-control glass-input"
                rows="2"
                placeholder="Updated description..."
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff" }}
              ></textarea>
            </div>
            <div className="d-flex gap-2">
              <button type="submit" disabled={updating} className="btn btn-primary px-4">
                {updating ? "Updating..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="btn btn-secondary px-3"
                onClick={() => setEditingVlog(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vlog Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-info" role="status"></div>
          <p className="mt-2 text-light-50">Loading vlogs...</p>
        </div>
      ) : displayedVlogs.length === 0 ? (
        <div
          className="text-center py-5 p-4 rounded-4"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <h5>
            {activeTab === "my-vlogs"
              ? "You haven't posted any vlogs yet! "
              : "No ideas from other creators found yet! "}
          </h5>
          <p className="text-light-50">
            {activeTab === "my-vlogs"
              ? "Click '+ Upload / Post Vlog' above to publish your first vlog."
              : "When other users sign in and post vlogs, they will appear right here."}
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {displayedVlogs.map((vlog) => {
            const isOwner =
              vlog.author?.trim().toLowerCase() === user?.email?.trim().toLowerCase();
            return (
              <div className="col-12 col-md-6 col-lg-4" key={vlog.id}>
                <div
                  className="h-100 rounded-4 overflow-hidden shadow d-flex flex-column"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.82)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                  }}
                >
                  {/* Video Thumbnail / Player */}
                  {(() => {
                    const info = getVideoInfo(vlog.videoUrl);
                    return (
                      <div
                        onClick={() => onWatch && onWatch(vlog)}
                        style={{ display: "block", height: "200px", position: "relative", backgroundColor: "#000", cursor: "pointer" }}
                      >
                        {info.thumbnail ? (
                          <img
                            src={info.thumbnail}
                            alt={vlog.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a", color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
                            Click to watch
                          </div>
                        )}
                        {/* Play Button Overlay */}
                        <div style={{
                          position: "absolute", top: "50%", left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: "52px", height: "52px",
                          backgroundColor: "rgba(0,0,0,0.7)",
                          borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: "2px solid rgba(255,255,255,0.8)",
                        }}>
                          <div style={{ width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: "18px solid #ffffff", marginLeft: "4px" }} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card Body */}
                  <div className="d-flex flex-column p-3 flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <h5 className="fw-bold text-truncate mb-0" style={{ color: "#fff", flex: 1 }}>
                        {vlog.title}
                      </h5>
                      {isOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(vlog);
                          }}
                          className="btn btn-sm btn-outline-info ms-2"
                          style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                    <p className="small flex-grow-1 mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {vlog.description}
                    </p>
                    <div
                      className="d-flex justify-content-between align-items-center pt-2 mt-auto"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
                    >
                      <small
                        onClick={() => onChannelOpen && onChannelOpen(vlog.author)}
                        style={{
                          color: "#38bdf8",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                        title={`Open ${vlog.author.split("@")[0]}'s Account`}
                      >
                        {vlog.author.split("@")[0]}
                      </small>
                      <small style={{ color: "rgba(255,255,255,0.4)" }}>{vlog.date}</small>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
