"use strict";

const path = require("path");

const DB_PATH = process.env.TECH_COMMUNITY_DB_PATH || path.join("/tmp", "tech-community.sqlite");
const SEED_DATA_PATH =
  process.env.TECH_COMMUNITY_SEED_PATH ||
  path.resolve(__dirname, "../../docs/data.json");

module.exports = {
  DB_PATH,
  SEED_DATA_PATH,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || "",
  CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL || "",
  OUTLOOK_SMTP_USER: process.env.OUTLOOK_SMTP_USER || "",
  OUTLOOK_SMTP_PASS: process.env.OUTLOOK_SMTP_PASS || "",
  MAIL_FROM_EMAIL: process.env.MAIL_FROM_EMAIL || process.env.OUTLOOK_SMTP_USER || "",
  MAIL_FROM_NAME: process.env.MAIL_FROM_NAME || "",
  SITE_ORIGIN: process.env.SITE_ORIGIN || "*",
};
