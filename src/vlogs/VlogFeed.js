import React, { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config";

export default function VlogFeed({ user, activeTab, onWatch, onChannelOpen }) {
  const [vlogs, setVlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Post form state
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);

  // Edit form state
  const [editingVlog, setEditingVlog] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [updating, setUpdating] = useState(false);
  const editFileInputRef = useRef(null);

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

  // Handle post image selection
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle edit image selection
  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const removeEditImage = () => {
    setEditImageFile(null);
    setEditImagePreview("");
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  // Post new vlog to Telegram
  const handlePostVlog = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setPosting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("videoUrl", videoUrl.trim());
      formData.append("description", description.trim());
      formData.append("author", user?.email || "Anonymous");
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await fetch(`${API_BASE_URL}/vlogs`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setTitle("");
        setVideoUrl("");
        setDescription("");
        removeImage();
        setShowForm(false);
        fetchVlogs();
      } else {
        alert(data.message || "Failed to publish vlog.");
      }
    } catch (err) {
      console.error("Error posting vlog:", err);
      alert("Error posting vlog. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (vlog) => {
    setEditingVlog(vlog);
    setEditTitle(vlog.title || "");
    setEditVideoUrl(vlog.videoUrl || "");
    setEditDescription(vlog.description || "");
    setEditImageFile(null);
    setEditImagePreview(vlog.imageUrl || "");
  };

  const handleUpdateVlog = async (e) => {
    e.preventDefault();
    if (!editingVlog || !editTitle.trim()) return;
    setUpdating(true);

    try {
      const formData = new FormData();
      formData.append("id", editingVlog.id);
      formData.append("title", editTitle.trim());
      formData.append("videoUrl", editVideoUrl.trim());
      formData.append("description", editDescription.trim());
      formData.append("author", user?.email || editingVlog.author || "Anonymous");
      if (editImageFile) {
        formData.append("image", editImageFile);
      } else if (editImagePreview) {
        formData.append("imageUrl", editImagePreview);
      } else {
        formData.append("imageUrl", "");
      }

      const res = await fetch(`${API_BASE_URL}/vlogs/edit`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setEditingVlog(null);
        removeEditImage();
        fetchVlogs();
      } else {
        alert(data.message || "Failed to update vlog.");
      }
    } catch (err) {
      console.error("Error updating vlog:", err);
      alert("Error updating vlog. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  // Extract YouTube video info (ID + thumbnail + watch link)
  const getVideoInfo = (url) => {
    if (!url) return { isYoutube: false, watchUrl: "", thumbnail: null };
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

      return { isYoutube: false, watchUrl: url, thumbnail: null };
    } catch {
      return { isYoutube: false, watchUrl: url, thumbnail: null };
    }
  };

  // Get full resolved cover image for a vlog
  const getVlogCoverImage = (vlog) => {
    if (vlog.imageUrl) {
      if (
        vlog.imageUrl.startsWith("http://") ||
        vlog.imageUrl.startsWith("https://") ||
        vlog.imageUrl.startsWith("data:") ||
        vlog.imageUrl.startsWith("blob:")
      ) {
        return vlog.imageUrl;
      }
      return `${API_BASE_URL}${vlog.imageUrl.startsWith("/") ? "" : "/"}${vlog.imageUrl}`;
    }
    const info = getVideoInfo(vlog.videoUrl);
    if (info.thumbnail) return info.thumbnail;
    return null;
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
              ? "Your personal creations, videos, images, and ideas"
              : "Ideas and vlogs shared by other creators in the community"}
          </p>
        </div>

        {activeTab === "my-vlogs" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn btn-primary fw-semibold px-4 shadow-sm"
            style={{
              background: showForm
                ? "rgba(239, 68, 68, 0.85)"
                : "linear-gradient(135deg, #4f46e5, #ec4899)",
              border: "none",
              borderRadius: "8px",
              transition: "all 0.2s ease",
            }}
          >
            {showForm ? "✕ Close Form" : "+ Upload / Post Vlog"}
          </button>
        )}
      </div>

      {/* Post Vlog Form Modal/Card */}
      {showForm && activeTab === "my-vlogs" && (
        <div
          className="p-4 rounded-4 mb-4 shadow-lg"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(129, 140, 248, 0.3)",
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold mb-0 text-white">✨ Create New Vlog / Idea</h4>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
              Video URL is Optional
            </span>
          </div>

          <form onSubmit={handlePostVlog}>
            <div className="row">
              {/* Title */}
              <div className="col-12 mb-3">
                <label className="form-label text-light small fw-semibold">
                  Vlog / Post Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control glass-input"
                  placeholder="e.g. My First Tech Vlog or Project Idea"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff",
                    borderRadius: "10px",
                  }}
                />
              </div>

              {/* Video URL (Optional) */}
              <div className="col-12 col-md-6 mb-3">
                <label className="form-label text-light small fw-semibold d-flex justify-content-between">
                  <span>🎬 Video / Stream URL</span>
                  <span className="text-muted small">(Optional)</span>
                </label>
                <input
                  type="url"
                  className="form-control glass-input"
                  placeholder="https://youtube.com/watch?v=... or MP4 link"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff",
                    borderRadius: "10px",
                  }}
                />
                <small className="text-light-50" style={{ fontSize: "0.75rem" }}>
                  Optional: YouTube link, Vimeo, or direct video URL.
                </small>
              </div>

              {/* Upload Image from Device (Optional) */}
              <div className="col-12 col-md-6 mb-3">
                <label className="form-label text-light small fw-semibold d-flex justify-content-between">
                  <span>🖼️ Image from Device</span>
                  <span className="text-info small">(Optional)</span>
                </label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                  id="vlog-device-image-input"
                />

                {!imagePreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: "2px dashed rgba(56, 189, 248, 0.4)",
                      borderRadius: "10px",
                      padding: "14px",
                      textAlign: "center",
                      cursor: "pointer",
                      backgroundColor: "rgba(56, 189, 248, 0.05)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#38bdf8")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)")}
                  >
                    <div style={{ fontSize: "1.2rem", marginBottom: "4px" }}>📁 ⬆️</div>
                    <div style={{ fontSize: "0.85rem", color: "#38bdf8", fontWeight: "600" }}>
                      Click to choose image from device
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }}>
                      PNG, JPG, JPEG, WEBP, or GIF
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      position: "relative",
                      borderRadius: "10px",
                      overflow: "hidden",
                      border: "1px solid rgba(56, 189, 248, 0.5)",
                      height: "80px",
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: "#000",
                    }}
                  >
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 14px",
                        background: "rgba(0,0,0,0.4)",
                      }}
                    >
                      <span className="badge bg-success" style={{ fontSize: "0.75rem" }}>
                        ✓ Image Selected
                      </span>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn btn-sm btn-outline-light"
                          style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={removeImage}
                          className="btn btn-sm btn-danger"
                          style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="col-12 mb-3">
                <label className="form-label text-light small fw-semibold">
                  Description / Content
                </label>
                <textarea
                  className="form-control glass-input"
                  rows="3"
                  placeholder="What is this vlog or idea about? Share your thoughts, notes, or details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff",
                    borderRadius: "10px",
                  }}
                ></textarea>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                type="submit"
                disabled={posting}
                className="btn btn-success px-4 fw-semibold"
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  borderRadius: "8px",
                }}
              >
                {posting ? (
                  <span>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Publishing...
                  </span>
                ) : (
                  "🚀 Publish Vlog / Post"
                )}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary px-3"
                onClick={() => setShowForm(false)}
                style={{ borderRadius: "8px" }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Vlog Form Modal/Card */}
      {editingVlog && (
        <div
          className="p-4 rounded-4 mb-4 shadow-lg"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold mb-0 text-white">✏️ Edit Vlog / Post</h4>
            <button
              onClick={() => {
                setEditingVlog(null);
                removeEditImage();
              }}
              className="btn btn-sm btn-outline-light"
              style={{ borderRadius: "6px" }}
            >
              ✕ Close
            </button>
          </div>

          <form onSubmit={handleUpdateVlog}>
            <div className="row">
              <div className="col-12 mb-3">
                <label className="form-label text-light small fw-semibold">
                  Vlog Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control glass-input"
                  placeholder="e.g. Updated Vlog Title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff",
                    borderRadius: "10px",
                  }}
                />
              </div>

              <div className="col-12 col-md-6 mb-3">
                <label className="form-label text-light small fw-semibold d-flex justify-content-between">
                  <span>🎬 Video / Stream URL</span>
                  <span className="text-muted small">(Optional)</span>
                </label>
                <input
                  type="url"
                  className="form-control glass-input"
                  placeholder="https://www.youtube.com/watch?v=... (Optional)"
                  value={editVideoUrl}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff",
                    borderRadius: "10px",
                  }}
                />
              </div>

              <div className="col-12 col-md-6 mb-3">
                <label className="form-label text-light small fw-semibold d-flex justify-content-between">
                  <span>🖼️ Cover / Device Image</span>
                  <span className="text-info small">(Optional)</span>
                </label>

                <input
                  type="file"
                  ref={editFileInputRef}
                  accept="image/*"
                  onChange={handleEditImageChange}
                  style={{ display: "none" }}
                  id="edit-vlog-device-image-input"
                />

                {!editImagePreview ? (
                  <div
                    onClick={() => editFileInputRef.current?.click()}
                    style={{
                      border: "2px dashed rgba(56, 189, 248, 0.4)",
                      borderRadius: "10px",
                      padding: "14px",
                      textAlign: "center",
                      cursor: "pointer",
                      backgroundColor: "rgba(56, 189, 248, 0.05)",
                    }}
                  >
                    <div style={{ fontSize: "1.2rem", marginBottom: "4px" }}>📁 ⬆️</div>
                    <div style={{ fontSize: "0.85rem", color: "#38bdf8", fontWeight: "600" }}>
                      Click to upload image from device
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      position: "relative",
                      borderRadius: "10px",
                      overflow: "hidden",
                      border: "1px solid rgba(56, 189, 248, 0.5)",
                      height: "80px",
                      display: "flex",
                      alignItems: "center",
                      backgroundColor: "#000",
                    }}
                  >
                    <img
                      src={
                        editImagePreview.startsWith("blob:") ||
                        editImagePreview.startsWith("http") ||
                        editImagePreview.startsWith("data:")
                          ? editImagePreview
                          : `${API_BASE_URL}${editImagePreview.startsWith("/") ? "" : "/"}${editImagePreview}`
                      }
                      alt="Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 14px",
                        background: "rgba(0,0,0,0.4)",
                      }}
                    >
                      <span className="badge bg-info text-dark" style={{ fontSize: "0.75rem" }}>
                        Cover Image
                      </span>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          onClick={() => editFileInputRef.current?.click()}
                          className="btn btn-sm btn-outline-light"
                          style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={removeEditImage}
                          className="btn btn-sm btn-danger"
                          style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="col-12 mb-3">
                <label className="form-label text-light small fw-semibold">Description</label>
                <textarea
                  className="form-control glass-input"
                  rows="3"
                  placeholder="Updated description..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff",
                    borderRadius: "10px",
                  }}
                ></textarea>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button
                type="submit"
                disabled={updating}
                className="btn btn-primary px-4 fw-semibold"
                style={{
                  background: "linear-gradient(135deg, #4f46e5, #3b82f6)",
                  border: "none",
                  borderRadius: "8px",
                }}
              >
                {updating ? (
                  <span>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Updating...
                  </span>
                ) : (
                  "💾 Save Changes"
                )}
              </button>
              <button
                type="button"
                className="btn btn-secondary px-3"
                onClick={() => {
                  setEditingVlog(null);
                  removeEditImage();
                }}
                style={{ borderRadius: "8px" }}
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
          <p className="mt-2 text-light-50">Loading vlogs & posts...</p>
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
              ? "Click '+ Upload / Post Vlog' above to publish your first video, image, or idea."
              : "When other users sign in and post vlogs or ideas, they will appear right here."}
          </p>
        </div>
      ) : (
        <div className="row g-4">
          {displayedVlogs.map((vlog) => {
            const isOwner =
              vlog.author?.trim().toLowerCase() === user?.email?.trim().toLowerCase();
            const coverImage = getVlogCoverImage(vlog);
            const hasVideo = Boolean(vlog.videoUrl && vlog.videoUrl.trim());
            const hasImage = Boolean(vlog.imageUrl && vlog.imageUrl.trim());

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
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 28px rgba(0,0,0,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
                  }}
                >
                  {/* Media / Cover Container */}
                  <div
                    onClick={() => onWatch && onWatch(vlog)}
                    style={{
                      display: "block",
                      height: "200px",
                      position: "relative",
                      backgroundColor: "#070b14",
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                  >
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={vlog.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: 0.9,
                          transition: "transform 0.3s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                      />
                    ) : (
                      /* No Image & No Video -> Sleek Aesthetic Idea Card Header */
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "linear-gradient(135deg, rgba(79, 70, 229, 0.3), rgba(236, 72, 153, 0.25))",
                          padding: "16px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontSize: "2.4rem", marginBottom: "6px" }}>💡</div>
                        <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "#fff", maxWidth: "90%" }} className="text-truncate">
                          {vlog.title}
                        </div>
                        <small style={{ color: "#38bdf8", fontSize: "0.75rem", marginTop: "4px" }}>
                          Click to view & discuss with AI
                        </small>
                      </div>
                    )}

                    {/* Media Type Badge (Top-Left) */}
                    <div style={{ position: "absolute", top: "10px", left: "10px", zIndex: 2 }}>
                      {hasVideo ? (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: "rgba(239, 68, 68, 0.85)",
                            backdropFilter: "blur(4px)",
                            fontSize: "0.72rem",
                            padding: "4px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          🎬 Video
                        </span>
                      ) : hasImage ? (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: "rgba(56, 189, 248, 0.85)",
                            color: "#0f172a",
                            backdropFilter: "blur(4px)",
                            fontSize: "0.72rem",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontWeight: "600",
                          }}
                        >
                          📸 Photo Post
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: "rgba(168, 85, 247, 0.85)",
                            backdropFilter: "blur(4px)",
                            fontSize: "0.72rem",
                            padding: "4px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          💡 Idea Post
                        </span>
                      )}
                    </div>

                    {/* Play / View Overlay Button */}
                    {hasVideo ? (
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          width: "50px",
                          height: "50px",
                          backgroundColor: "rgba(0,0,0,0.65)",
                          backdropFilter: "blur(4px)",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2px solid rgba(255,255,255,0.85)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                        }}
                      >
                        <div
                          style={{
                            width: 0,
                            height: 0,
                            borderTop: "9px solid transparent",
                            borderBottom: "9px solid transparent",
                            borderLeft: "16px solid #ffffff",
                            marginLeft: "4px",
                          }}
                        />
                      </div>
                    ) : coverImage ? (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "10px",
                          right: "10px",
                          backgroundColor: "rgba(0,0,0,0.6)",
                          backdropFilter: "blur(4px)",
                          color: "#fff",
                          borderRadius: "6px",
                          padding: "3px 8px",
                          fontSize: "0.72rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        🔍 View Post
                      </div>
                    ) : null}
                  </div>

                  {/* Card Body */}
                  <div className="d-flex flex-column p-3 flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <h5
                        className="fw-bold text-truncate mb-0"
                        style={{ color: "#fff", flex: 1, cursor: "pointer" }}
                        onClick={() => onWatch && onWatch(vlog)}
                        title={vlog.title}
                      >
                        {vlog.title}
                      </h5>
                      {isOwner && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(vlog);
                          }}
                          className="btn btn-sm btn-outline-info ms-2"
                          style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "6px" }}
                        >
                          ✏️ Edit
                        </button>
                      )}
                    </div>

                    <p
                      className="small flex-grow-1 mb-2"
                      style={{
                        color: "rgba(255,255,255,0.65)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        fontSize: "0.84rem",
                        lineHeight: "1.4",
                      }}
                    >
                      {vlog.description || "No description provided."}
                    </p>

                    <div
                      className="d-flex justify-content-between align-items-center pt-2 mt-auto"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}
                    >
                      <small
                        onClick={() => onChannelOpen && onChannelOpen(vlog.author)}
                        style={{
                          color: "#38bdf8",
                          cursor: "pointer",
                          fontWeight: "500",
                        }}
                        title={`Open ${vlog.author.split("@")[0]}'s Profile`}
                      >
                        👤 {vlog.author.split("@")[0]}
                      </small>
                      <small style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>
                        {vlog.date}
                      </small>
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
