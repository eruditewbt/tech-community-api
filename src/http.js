"use strict";

const { ADMIN_TOKEN, SITE_ORIGIN } = require("./config");

function corsHeaders() {
  return {
    "access-control-allow-origin": SITE_ORIGIN || "*",
    "access-control-allow-headers": "Content-Type, Authorization, X-Admin-Token",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "content-type": "application/json; charset=utf-8",
  };
}

function ok(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(body),
  };
}

function json(body, statusCode = 200) {
  return ok(statusCode, body);
}

function error(message, statusCode = 400, extra = {}) {
  return ok(statusCode, { ok: false, error: message, ...extra });
}

function parseBody(event) {
  if (!event || !event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (_) {
    return {};
  }
}

function cleanText(value, max = 5000) {
  const text = String(value == null ? "" : value)
    .replace(/\r/g, "")
    .replace(/\u0000/g, "")
    .trim();
  return text.slice(0, max);
}

function cleanOptionalEmail(value) {
  const email = cleanText(value, 320).toLowerCase();
  if (!email) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function withErrorBoundary(handler) {
  return async (event, context) => {
    try {
      return await handler(event, context);
    } catch (err) {
      return error("Internal server error.", 500, {
        detail: process.env.NODE_ENV === "development" ? String(err && err.message) : undefined,
      });
    }
  };
}

function getAdminToken(event) {
  const headers = event && event.headers ? event.headers : {};
  const auth = headers.authorization || headers.Authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return headers["x-admin-token"] || headers["X-Admin-Token"] || "";
}

function requireAdmin(event) {
  if (!ADMIN_TOKEN) {
    return { ok: false, response: error("Admin token is not configured on the server.", 500) };
  }
  const token = getAdminToken(event);
  if (!token || token !== ADMIN_TOKEN) {
    return { ok: false, response: error("Unauthorized.", 401) };
  }
  return { ok: true };
}

function handleOptions(event) {
  if (event && event.httpMethod === "OPTIONS") {
    return ok(200, { ok: true });
  }
  return null;
}

module.exports = {
  corsHeaders,
  json,
  error,
  parseBody,
  cleanText,
  cleanOptionalEmail,
  requireAdmin,
  handleOptions,
  withErrorBoundary,
};
