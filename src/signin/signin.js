import React, { useState } from "react";
import { API_BASE_URL } from "../config";

export default function Signin({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (onLoginSuccess) {
          onLoginSuccess({ email: cleanEmail });
        }
      } else {
        setErrorMsg(data.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Connection error:", error);
      setErrorMsg("Unable to connect to backend. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    color: "#ffffff",
    borderRadius: "8px",
    padding: "10px 14px",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "8px",
    fontWeight: "500",
    color: "#e2e8f0",
    fontSize: "0.95rem"
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ width: "100%", boxSizing: "border-box" }}>
        {errorMsg && (
          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.18)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#fca5a5",
              borderRadius: "8px",
              padding: "10px 14px",
              marginBottom: "16px",
              fontSize: "0.88rem",
              textAlign: "center"
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Email Field */}
        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="inputEmail3" style={labelStyle}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="email"
            disabled={loading}
            className="form-control glass-input"
            id="inputEmail3"
            placeholder="name@example.com"
            style={inputStyle}
          />
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: "24px" }}>
          <label htmlFor="inputPassword3" style={labelStyle}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={loading}
            className="form-control glass-input"
            id="inputPassword3"
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        {/* Sunset Gradient Button */}
        <div>
          <button
            type="submit"
            disabled={loading}
            className="btn w-100 py-2 fw-semibold"
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #a855f7 50%, #ec4899 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              boxShadow: "0 4px 15px rgba(236, 72, 153, 0.35)",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? (
              <span>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Signing In...
              </span>
            ) : (
              "Sign In / Auto-Register"
            )}
          </button>
        </div>
        <p className="text-center text-light-50 small mt-3 mb-0" style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>
          New users will be registered automatically upon first sign in.
        </p>
      </form>
    </div>
  );
}
