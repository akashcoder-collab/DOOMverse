// Smart API Base URL resolver for Local Dev, Network IP, and HTTPS Render Production
let apiBase = process.env.REACT_APP_API_URL;

if (!apiBase) {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host.startsWith("172.") || host.startsWith("192.")) {
    apiBase = `http://${host}:5000`;
  } else if (host.includes(".onrender.com")) {
    // Automatically map doomverse-frontend.onrender.com -> doomverse-backend.onrender.com
    const backendHost = host.replace("-frontend", "-backend");
    apiBase = `https://${backendHost}`;
  } else {
    apiBase = `https://${host}`;
  }
} else {
  if (!apiBase.startsWith("http://") && !apiBase.startsWith("https://")) {
    apiBase = `https://${apiBase}`;
  }
}

export const API_BASE_URL = apiBase;
