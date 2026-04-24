"use strict";

const { ADMIN_TOKEN, SITE_ORIGIN } = require("./config");

const DEFAULT_ALLOWED_ORIGINS = [
  "https://eruditewbt.github.io",
  "https://eruditewbt.netlify.app",
  "http://localhost:8888",
  "http://localhost:3000",
  "http://127.0.0.1:8888",
  "http://127.0.0.1:3000",
];

function normalizeOrigin(value) {
  const text = String(value || "").trim();
  if (!text || text === "*") return "";
  try {
    return new URL(text).origin;
  } catch (_) {
    return "";
  }
}

function allowedOrigins() {
  const custom = String(SITE_ORIGIN || "")
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...custom]));
}

function requestOrigin(event) {
  const headers = (event && event.headers) || {};
  return normalizeOrigin(headers.origin || headers.Origin || "");
}

function resolvedOrigin(event) {
  const origin = requestOrigin(event);
  const allowed = allowedOrigins();
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0] || "*";
}

function corsHeaders(event) {
  return {
    "access-control-allow-origin": resolvedOrigin(event),
    "access-control-allow-headers": "Content-Type, Authorization, X-Admin-Token",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-max-age": "86400",
    vary: "Origin",
    "content-type": "application/json; charset=utf-8",
  };
}

function ok(statusCode, body, event) {
  return {
    statusCode,
    headers: corsHeaders(event),
    body: JSON.stringify(body),
  };
}

function json(body, statusCode = 200, event) {
  return ok(statusCode, body, event);
}

function error(message, statusCode = 400, extra = {}, event) {
  return ok(statusCode, { ok: false, error: message, ...extra }, event);
}

function parseBody(event) {
  if (!event || !event.body) return {};
  let body = event.body;
  if (event.isBase64Encoded) {
    try {
      body = Buffer.from(body, "base64").toString("utf8");
    } catch (_) {
      return {};
    }
  }
  try {
    return JSON.parse(body);
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
      return error(
        "Internal server error.",
        500,
        {
          detail: process.env.NODE_ENV === "development" ? String(err && err.message) : undefined,
        },
        event
      );
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
    return { ok: false, response: error("Admin token is not configured on the server.", 500, {}, event) };
  }
  const token = getAdminToken(event);
  if (!token || token !== ADMIN_TOKEN) {
    return { ok: false, response: error("Unauthorized.", 401, {}, event) };
  }
  return { ok: true };
}

function methodOf(event) {
  return (
    (event && event.httpMethod) ||
    (event && event.requestContext && event.requestContext.http && event.requestContext.http.method) ||
    "GET"
  ).toUpperCase();
}

function handleOptions(event) {
  if (methodOf(event) !== "OPTIONS") return null;
  return {
    statusCode: 204,
    headers: corsHeaders(event),
    body: "",
  };
}

module.exports = {
  allowedOrigins,
  corsHeaders,
  json,
  error,
  parseBody,
  cleanText,
  cleanOptionalEmail,
  requireAdmin,
  handleOptions,
  withErrorBoundary,
  methodOf,
};
