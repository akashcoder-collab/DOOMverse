import React, { useState } from "react";
import { API_BASE_URL } from "../config";

export default function Signin({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (onLoginSuccess) {
          onLoginSuccess({ email: email });
        }
      } else {
        setErrorMsg(data.message || "Login failed.");
      }
    } catch (error) {
      console.error("Connection error:", error);
      setErrorMsg("Unable to connect to backend.");
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
    color: "#e2e8f0", // Soft light silver/lavender
    fontSize: "0.95rem"
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ width: "100%", boxSizing: "border-box" }}>
        {errorMsg && (
          <div style={{ color: "#f87171", marginBottom: "16px", fontSize: "0.88rem", textAlign: "center" }}>
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
            className="btn w-100 py-2 fw-semibold"
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #a855f7 50%, #ec4899 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              boxShadow: "0 4px 15px rgba(236, 72, 153, 0.35)",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
}
