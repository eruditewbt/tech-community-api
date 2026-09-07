"use strict";

const { CONNECTWBT_BASE_URL, CONNECTWBT_TIMEOUT_MS } = require("./config");

function bearerToken(event) {
  const headers = (event && event.headers) || {};
  const value = headers.authorization || headers.Authorization || "";
  return value.replace(/^Bearer\s+/i, "").trim();
}

async function authenticate(event) {
  const token = bearerToken(event);
  if (!token) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECTWBT_TIMEOUT_MS);
  try {
    const response = await fetch(`${CONNECTWBT_BASE_URL}/api/v1/auth/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => ({}));
    return payload?.data?.user || payload?.user || null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { authenticate, bearerToken };
