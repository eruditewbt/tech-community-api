"use strict";

const {
  COMMUNITY_PERSISTENCE,
  CONNECTWBT_API_TOKEN,
  CONNECTWBT_BASE_URL,
  CONNECTWBT_PROJECT_ID,
  CONNECTWBT_TIMEOUT_MS,
} = require("./config");

const COLLECTION_PREFIX = "community_";

function enabled() {
  return (
    COMMUNITY_PERSISTENCE === "connectwbt" && Boolean(CONNECTWBT_API_TOKEN)
  );
}

function collectionId(name) {
  return `${COLLECTION_PREFIX}${String(name).replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

async function request(path, { method = "GET", body } = {}) {
  if (!enabled()) throw new Error("ConnectWBT persistence is not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECTWBT_TIMEOUT_MS);
  try {
    const response = await fetch(`${CONNECTWBT_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${CONNECTWBT_API_TOKEN}`,
        "X-ConnectCrypt-Project": CONNECTWBT_PROJECT_ID,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.message ||
        `ConnectWBT persistence failed (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return payload?.data || payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureCollection(name) {
  const id = collectionId(name);
  try {
    await request(
      `/api/v1/projects/${encodeURIComponent(CONNECTWBT_PROJECT_ID)}/collections`,
      {
        method: "POST",
        body: {
          collectionId: id,
          name: `EruditeWBT ${name}`,
          schemaVersion: 1,
          fields: [],
          indexes: ["created_at", "owner_uid", "session_id"],
          permissions: ["community.persistence"],
        },
      },
    );
  } catch (error) {
    // Collection creation is idempotent at the application boundary; an
    // already-existing collection should not prevent document writes.
    if (
      error.status !== 409 &&
      !/already|exists|duplicate/i.test(error.message)
    )
      throw error;
  }
  return id;
}

async function insert(name, document) {
  const id = await ensureCollection(name);
  return request(
    `/api/v1/projects/${encodeURIComponent(CONNECTWBT_PROJECT_ID)}/collections/${encodeURIComponent(id)}/documents`,
    {
      method: "POST",
      body: { ...document, persistence_source: "tech-community-api" },
    },
  );
}

async function list(name, { limit = 50 } = {}) {
  const id = collectionId(name);
  const result = await request(
    `/api/v1/projects/${encodeURIComponent(CONNECTWBT_PROJECT_ID)}/collections/${encodeURIComponent(id)}/documents`,
  );
  const documents = Array.isArray(result) ? result : result.documents || [];
  return documents.slice(-Number(limit || 50)).reverse();
}

module.exports = { enabled, collectionId, insert, list };
