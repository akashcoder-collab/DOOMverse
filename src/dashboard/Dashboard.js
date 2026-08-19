import React, { useState } from "react";

export default function Dashboard({ user, onLogout }) {
  const [selectedCourse, setSelectedCourse] = useState(null);

  const sampleCourses = [
    {
      id: 1,
      title: "Deep Learning & Neural Networks",
      instructor: "Dr. Andrew Ng",
      level: "Intermediate",
      duration: "12 Hours",
      thumbnail: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=600&q=80",
      description: "Master CNNs, RNNs, Transformers, and PyTorch deep learning architectures from scratch."
    },
    {
      id: 2,
      title: "Full Stack React & Node Mastery",
      instructor: "Sarah Jenkins",
      level: "Beginner to Pro",
      duration: "18 Hours",
      thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=600&q=80",
      description: "Build robust scalable modern applications using React 19, Express, and modern REST APIs."
    },
    {
      id: 3,
      title: "Python Backend & Telegram Bots",
      instructor: "Alex Rivera",
      level: "All Levels",
      duration: "8 Hours",
      thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
      description: "Integrate Telethon, asynchronous Flask, and build cloud-connected automation pipelines."
    }
  ];

  return (
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      {/* Top Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-4 shadow-sm">
        <div className="container-fluid">
          <span className="navbar-brand fw-bold fs-4">
            🎓 Edu<span style={{ color: "#0d6efd" }}>Stream</span>
          </span>

          <div className="d-flex align-items-center gap-3">
            <span className="text-light small">
              Signed in as: <strong className="text-info">{user?.email || "Student"}</strong>
            </span>
            <button
              onClick={onLogout}
              className="btn btn-outline-danger btn-sm px-3"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container py-5">
        {/* Welcome Banner */}
        <div className="p-4 mb-5 rounded-3 bg-white shadow-sm border border-light-subtle">
          <div className="row align-items-center">
            <div className="col-md-8">
              <h1 className="display-6 fw-bold text-dark mb-2">
                Welcome back, {user?.email?.split("@")[0] || "Learner"}! 👋
              </h1>
              <p className="text-muted mb-0">
                You have successfully authenticated with DOOMverse. Pick up where you left off or start exploring your live courses.
              </p>
            </div>
            <div className="col-md-4 text-md-end mt-3 mt-md-0">
              <span className="badge bg-success fs-6 p-2">
                Status: Connected 🟢
              </span>
            </div>
          </div>
        </div>

        {/* Selected Course Alert */}
        {selectedCourse && (
          <div className="alert alert-primary alert-dismissible fade show shadow-sm mb-4" role="alert">
            <strong>Now Streaming:</strong> {selectedCourse.title} with {selectedCourse.instructor}
            <button
              type="button"
              className="btn-close"
              onClick={() => setSelectedCourse(null)}
              aria-label="Close"
            ></button>
          </div>
        )}

        {/* Courses Section */}
        <h3 className="fw-bold mb-4 text-dark">Available Streams & Courses</h3>
        <div className="row g-4">
          {sampleCourses.map((course) => (
            <div className="col-md-4" key={course.id}>
              <div className="card h-100 shadow-sm border-0 rounded-3 overflow-hidden">
                <img
                  src={course.thumbnail}
                  className="card-img-top"
                  alt={course.title}
                  style={{ height: "180px", objectFit: "cover" }}
                />
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="badge bg-secondary-subtle text-dark border">
                      {course.level}
                    </span>
                    <span className="text-muted small">⏱ {course.duration}</span>
                  </div>
                  <h5 className="card-title fw-bold">{course.title}</h5>
                  <p className="card-text text-muted small flex-grow-1">
                    {course.description}
                  </p>
                  <div className="mt-3 d-flex justify-content-between align-items-center">
                    <small className="text-muted">By {course.instructor}</small>
                    <button
                      onClick={() => setSelectedCourse(course)}
                      className="btn btn-primary btn-sm px-3"
                    >
                      Start Stream ▶
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
