"use strict";

const path = require("path");

const DB_PATH =
  process.env.TECH_COMMUNITY_DB_PATH ||
  path.join("/tmp", "tech-community.sqlite");
const SEED_DATA_PATH =
  process.env.TECH_COMMUNITY_SEED_PATH ||
  path.resolve(__dirname, "../../docs/data.json");

module.exports = {
  DB_PATH,
  COMMUNITY_PERSISTENCE: process.env.COMMUNITY_PERSISTENCE || "legacy",
  CONNECTWBT_BASE_URL: (
    process.env.CONNECTWBT_BASE_URL || "https://connectwbt.netlify.app"
  ).replace(/\/$/, ""),
  CONNECTWBT_API_TOKEN: process.env.CONNECTWBT_API_TOKEN || "",
  CONNECTWBT_PROJECT_ID:
    process.env.CONNECTWBT_PROJECT_ID || "eruditewbt-tech-community",
  CONNECTWBT_TIMEOUT_MS: Number(process.env.CONNECTWBT_TIMEOUT_MS || 10000),
  INTELLIGENTSIA_ENABLED:
    String(process.env.INTELLIGENTSIA_ENABLED || "false").toLowerCase() ===
    "true",
  INTELLIGENTSIA_RUNTIME_URL: (
    process.env.INTELLIGENTSIA_RUNTIME_URL ||
    "https://connectwbt.netlify.app/api/v1/ai/runtime/runtime"
  ).replace(/\/$/, ""),
  INTELLIGENTSIA_CLIENT_ID:
    process.env.INTELLIGENTSIA_CLIENT_ID || "tech-community",
  SEED_DATA_PATH,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || "",
  CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL || "",
  OUTLOOK_SMTP_USER: process.env.OUTLOOK_SMTP_USER || "",
  OUTLOOK_SMTP_PASS: process.env.OUTLOOK_SMTP_PASS || "",
  MAIL_FROM_EMAIL:
    process.env.MAIL_FROM_EMAIL || process.env.OUTLOOK_SMTP_USER || "",
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || "",
  SITE_ORIGIN: process.env.SITE_ORIGIN || "*",
};
