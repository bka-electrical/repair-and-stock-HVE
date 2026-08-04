// api/_lib/helpers.js
// Shared helpers untuk API handlers.

export function getCorsHeaders(req) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const origin = req.headers?.origin || "";
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  };
}

export function sanitizeError(error) {
  if (process.env.NODE_ENV === "production") {
    return "Terjadi kesalahan server";
  }
  return error?.message || "Terjadi kesalahan server";
}
