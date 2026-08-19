// Dynamic API Base URL supporting Render production deployment and local dev
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;

