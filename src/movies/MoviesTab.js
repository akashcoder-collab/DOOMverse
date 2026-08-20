import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

const GENRES = ["All", "Action", "Sci-Fi", "Drama", "Animation", "Comedy", "Horror", "History"];

export default function MoviesTab() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch movies from backend
  const fetchMovies = async (query = "", genre = "All") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query.trim()) params.append("q", query.trim());
      if (genre && genre !== "All") params.append("genre", genre);
      
      const res = await fetch(`${API_BASE_URL}/movies/trending?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setMovies(data.movies || []);
      }
    } catch (err) {
      console.error("Error loading movies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies(searchQuery, selectedGenre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenre]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMovies(searchQuery, selectedGenre);
  };

  const handleOpenDetails = async (movie) => {
    setSelectedMovie(movie);
    try {
      setModalLoading(true);
      const res = await fetch(`${API_BASE_URL}/movies/${movie.id}`);
      const data = await res.json();
      if (res.ok && data.movie) {
        setSelectedMovie(data.movie);
      }
    } catch (err) {
      console.error("Error fetching movie details:", err);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="container py-4">
      {/* Header Banner */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom border-secondary-subtle">
        <div>
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: "1.8rem" }}>🎬</span>
            <h2 className="fw-bold mb-0 text-white" style={{ letterSpacing: "-0.5px" }}>
              New & Trending <span style={{ color: "#38bdf8" }}>Movies</span>
            </h2>
          </div>
          <p className="small mb-0 mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
            Explore latest blockbuster movies, ratings, storylines, and starring actors & cast details.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="d-flex gap-2" style={{ minWidth: "280px" }}>
          <div className="position-relative flex-grow-1">
            <input
              type="text"
              className="form-control glass-input"
              placeholder="Search movie, actor, or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                borderRadius: "10px",
                paddingLeft: "36px",
                fontSize: "0.9rem",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.6,
                fontSize: "0.85rem",
              }}
            >
              🔍
            </span>
          </div>
          <button
            type="submit"
            className="btn btn-primary fw-semibold px-3"
            style={{
              background: "linear-gradient(135deg, #38bdf8, #6366f1)",
              border: "none",
              borderRadius: "10px",
              fontSize: "0.88rem",
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Genre Filter Pills */}
      <div className="d-flex align-items-center gap-2 mb-4 overflow-auto pb-2 scrollbar-none" style={{ flexWrap: "wrap" }}>
        <span className="small fw-bold me-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          Genre:
        </span>
        {GENRES.map((genre) => {
          const isActive = selectedGenre === genre;
          return (
            <button
              key={genre}
              onClick={() => {
                setSelectedGenre(genre);
              }}
              style={{
                background: isActive
                  ? "linear-gradient(135deg, #4f46e5, #ec4899)"
                  : "rgba(255, 255, 255, 0.08)",
                border: isActive
                  ? "1px solid rgba(255,255,255,0.4)"
                  : "1px solid rgba(255, 255, 255, 0.12)",
                color: isActive ? "#ffffff" : "rgba(255,255,255,0.75)",
                padding: "5px 14px",
                borderRadius: "20px",
                fontSize: "0.82rem",
                fontWeight: isActive ? "600" : "400",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {genre}
            </button>
          );
        })}
      </div>

      {/* Movies Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-info" role="status"></div>
          <p className="mt-3 small" style={{ color: "rgba(255,255,255,0.6)" }}>
            Loading movie library & cast details...
          </p>
        </div>
      ) : movies.length === 0 ? (
        <div
          className="text-center py-5 p-4 rounded-4"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <div style={{ fontSize: "2.5rem" }}>🎭</div>
          <h5 className="mt-2 text-white">No Movies Found</h5>
          <p className="small mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>
            No movies match your search query or selected genre filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedGenre("All");
              fetchMovies("", "All");
            }}
            className="btn btn-sm btn-outline-info px-3"
            style={{ borderRadius: "8px" }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {movies.map((movie) => (
            <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={movie.id}>
              <div
                className="movie-card h-100 rounded-4 overflow-hidden d-flex flex-column"
                style={{
                  backgroundColor: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
                  cursor: "pointer",
                }}
                onClick={() => handleOpenDetails(movie)}
              >
                {/* Poster Box */}
                <div style={{ position: "relative", width: "100%", paddingTop: "145%", overflow: "hidden", backgroundColor: "#000" }}>
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.4s ease",
                    }}
                    className="movie-poster-img"
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80";
                    }}
                  />

                  {/* Rating Badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      left: "10px",
                      background: "rgba(15, 23, 42, 0.85)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      borderRadius: "8px",
                      padding: "3px 8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "#fbbf24",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                    }}
                  >
                    <span>⭐</span>
                    <span style={{ color: "#fff" }}>{movie.rating || "N/A"}</span>
                  </div>

                  {/* Year Badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      background: "rgba(56, 189, 248, 0.85)",
                      backdropFilter: "blur(8px)",
                      borderRadius: "8px",
                      padding: "3px 8px",
                      color: "#0f172a",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                    }}
                  >
                    {movie.year || "2024"}
                  </div>

                  {/* Hover Overlay */}
                  <div className="movie-hover-overlay">
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #4f46e5, #ec4899)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                        boxShadow: "0 0 20px rgba(236,72,153,0.6)",
                      }}
                    >
                      ▶
                    </div>
                    <span className="small text-white fw-semibold mt-2">View Details & Cast</span>
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-3 d-flex flex-column flex-grow-1">
                  <h6 className="fw-bold text-white mb-1 text-truncate" title={movie.title} style={{ fontSize: "1rem" }}>
                    {movie.title}
                  </h6>

                  {/* Genres / Tags */}
                  <div className="d-flex gap-1 mb-2 flex-wrap">
                    {(movie.genres || ["Movie"]).slice(0, 2).map((g, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: "0.7rem",
                          background: "rgba(255, 255, 255, 0.1)",
                          color: "rgba(255, 255, 255, 0.8)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {g}
                      </span>
                    ))}
                    {movie.runtime && movie.runtime !== "N/A" && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "rgba(255, 255, 255, 0.5)",
                          alignSelf: "center",
                          marginLeft: "auto",
                        }}
                      >
                        ⏱ {movie.runtime}
                      </span>
                    )}
                  </div>

                  {/* Synopsis snippet */}
                  <p
                    className="small mb-3 flex-grow-1"
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: "0.8rem",
                      lineHeight: "1.4",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {movie.overview}
                  </p>

                  {/* Star Cast Preview */}
                  {movie.cast && movie.cast.length > 0 && (
                    <div
                      className="pt-2 mt-auto"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <small style={{ color: "#38bdf8", fontSize: "0.75rem", fontWeight: "600" }}>
                          🌟 Cast:
                        </small>
                        <small
                          className="text-truncate ms-1"
                          style={{
                            color: "rgba(255,255,255,0.75)",
                            fontSize: "0.74rem",
                            maxWidth: "180px",
                          }}
                          title={movie.cast.map((c) => c.name).join(", ")}
                        >
                          {movie.cast.slice(0, 3).map((c) => c.name).join(", ")}
                        </small>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Movie Details & Cast Modal */}
      {selectedMovie && (
        <div
          className="modal-backdrop-custom"
          onClick={() => setSelectedMovie(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.82)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="movie-modal-card rounded-4 overflow-hidden shadow-lg"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.96)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              maxWidth: "850px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              color: "#ffffff",
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedMovie(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 10,
                fontSize: "1rem",
              }}
            >
              ✕
            </button>

            {/* Backdrop Banner */}
            <div
              style={{
                height: "240px",
                width: "100%",
                position: "relative",
                backgroundImage: `url(${selectedMovie.backdropUrl || selectedMovie.posterUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(to top, rgba(15, 23, 42, 0.98) 10%, rgba(15, 23, 42, 0.4) 60%, rgba(15, 23, 42, 0.8) 100%)",
                }}
              />
            </div>

            {/* Content Container */}
            <div className="p-4" style={{ marginTop: "-80px", position: "relative", zIndex: 2 }}>
              <div className="d-flex flex-column flex-md-row gap-4 align-items-start">
                {/* Poster */}
                <img
                  src={selectedMovie.posterUrl}
                  alt={selectedMovie.title}
                  style={{
                    width: "150px",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.7)",
                    border: "2px solid rgba(255,255,255,0.2)",
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80";
                  }}
                />

                {/* Main Header Info */}
                <div className="flex-grow-1">
                  <h3 className="fw-bold mb-1 text-white">{selectedMovie.title}</h3>
                  {selectedMovie.tagline && (
                    <p className="fst-italic small mb-2" style={{ color: "#38bdf8" }}>
                      "{selectedMovie.tagline}"
                    </p>
                  )}

                  {/* Metadata Chips */}
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                    <span
                      style={{
                        background: "#fbbf24",
                        color: "#0f172a",
                        fontWeight: "700",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                      }}
                    >
                      ⭐ {selectedMovie.rating} / 10
                    </span>
                    <span
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                        color: "#ffffff",
                      }}
                    >
                      📅 {selectedMovie.releaseDate || selectedMovie.year}
                    </span>
                    {selectedMovie.runtime && selectedMovie.runtime !== "N/A" && (
                      <span
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          padding: "3px 10px",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          color: "#ffffff",
                        }}
                      >
                        ⏱ {selectedMovie.runtime}
                      </span>
                    )}
                    {selectedMovie.director && (
                      <span
                        style={{
                          background: "rgba(99, 102, 241, 0.2)",
                          border: "1px solid rgba(99, 102, 241, 0.4)",
                          padding: "3px 10px",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          color: "#a5b4fc",
                        }}
                      >
                        🎬 Dir: {selectedMovie.director}
                      </span>
                    )}
                  </div>

                  {/* Genres */}
                  <div className="d-flex gap-2 mb-3 flex-wrap">
                    {(selectedMovie.genres || []).map((g, i) => (
                      <span
                        key={i}
                        style={{
                          background: "linear-gradient(135deg, rgba(79, 70, 229, 0.3), rgba(236, 72, 153, 0.3))",
                          border: "1px solid rgba(255,255,255,0.15)",
                          padding: "4px 10px",
                          borderRadius: "16px",
                          fontSize: "0.78rem",
                          color: "#ffffff",
                        }}
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  {/* Watch Trailer Link */}
                  {selectedMovie.trailerUrl && (
                    <a
                      href={selectedMovie.trailerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm px-3 fw-bold d-inline-flex align-items-center gap-2"
                      style={{
                        background: "linear-gradient(135deg, #ef4444, #dc2626)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                      }}
                    >
                      <span>▶</span> Watch Official Trailer
                    </a>
                  )}
                </div>
              </div>

              {/* Storyline / Synopsis */}
              <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                <h5 className="fw-bold text-white mb-2" style={{ fontSize: "1.1rem" }}>
                  📖 Storyline & Overview
                </h5>
                <p style={{ color: "rgba(255,255,255,0.8)", lineHeight: "1.6", fontSize: "0.92rem" }}>
                  {selectedMovie.overview}
                </p>
              </div>

              {/* Starring Actors / Cast Section */}
              <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                <h5 className="fw-bold text-white mb-3" style={{ fontSize: "1.1rem" }}>
                  🌟 Starring Actors & Cast ({selectedMovie.cast ? selectedMovie.cast.length : 0})
                </h5>

                {modalLoading ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm text-info"></div>
                  </div>
                ) : selectedMovie.cast && selectedMovie.cast.length > 0 ? (
                  <div className="row g-3">
                    {selectedMovie.cast.map((actor, idx) => (
                      <div className="col-6 col-sm-4 col-md-3" key={idx}>
                        <div
                          className="p-2 rounded-3 text-center h-100 d-flex flex-column align-items-center"
                          style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.08)",
                          }}
                        >
                          <div
                            style={{
                              width: "60px",
                              height: "60px",
                              borderRadius: "50%",
                              overflow: "hidden",
                              marginBottom: "8px",
                              border: "2px solid #38bdf8",
                              backgroundColor: "#1e293b",
                            }}
                          >
                            <img
                              src={actor.photoUrl}
                              alt={actor.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(actor.name)}&background=4f46e5&color=fff`;
                              }}
                            />
                          </div>
                          <div className="fw-bold text-white text-truncate w-100" style={{ fontSize: "0.85rem" }} title={actor.name}>
                            {actor.name}
                          </div>
                          <small
                            className="text-truncate w-100 mt-auto"
                            style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem" }}
                            title={actor.character}
                          >
                            as {actor.character || "Cast"}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="small text-light-50">Cast information not available for this title.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
