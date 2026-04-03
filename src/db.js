"use strict";

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { DB_PATH } = require("./config");
const { cleanText, cleanOptionalEmail } = require("./http");

let db;

function ensureDb() {
  if (db) return db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      page TEXT,
      label TEXT,
      href TEXT,
      session_id TEXT,
      referrer TEXT,
      payload_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS intents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      field TEXT,
      intent TEXT,
      skills TEXT,
      looking_for TEXT,
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      subject TEXT,
      message TEXT,
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

function insertActivity(input) {
  const conn = ensureDb();
  const stmt = conn.prepare(`
    INSERT INTO activities (event_type, page, label, href, session_id, referrer, payload_json)
    VALUES (@event_type, @page, @label, @href, @session_id, @referrer, @payload_json)
  `);
  const payloadJson = input.payload ? JSON.stringify(input.payload) : null;
  const info = stmt.run({
    event_type: cleanText(input.event_type || "event", 120),
    page: cleanText(input.page || "", 400),
    label: cleanText(input.label || "", 240),
    href: cleanText(input.href || "", 1000),
    session_id: cleanText(input.session_id || "", 240),
    referrer: cleanText(input.referrer || "", 1000),
    payload_json: payloadJson,
  });
  return { id: info.lastInsertRowid };
}

function insertIntent(input) {
  const conn = ensureDb();
  const stmt = conn.prepare(`
    INSERT INTO intents (name, email, field, intent, skills, looking_for, source)
    VALUES (@name, @email, @field, @intent, @skills, @looking_for, @source)
  `);
  const info = stmt.run({
    name: cleanText(input.name || "", 160),
    email: cleanOptionalEmail(input.email || "") || "",
    field: cleanText(input.field || "", 160),
    intent: cleanText(input.intent || "", 500),
    skills: cleanText(input.skills || "", 2000),
    looking_for: cleanText(input.looking_for || "", 2000),
    source: cleanText(input.source || "", 120),
  });
  return { id: info.lastInsertRowid };
}

function insertContact(input) {
  const conn = ensureDb();
  const stmt = conn.prepare(`
    INSERT INTO contacts (name, email, subject, message, source)
    VALUES (@name, @email, @subject, @message, @source)
  `);
  const info = stmt.run({
    name: cleanText(input.name || "", 160),
    email: cleanOptionalEmail(input.email || "") || "",
    subject: cleanText(input.subject || "", 240),
    message: cleanText(input.message || "", 6000),
    source: cleanText(input.source || "", 120),
  });
  return { id: info.lastInsertRowid };
}

function listRecent(table, limit = 25) {
  const conn = ensureDb();
  const safeTable = ["activities", "intents", "contacts"].includes(table) ? table : "activities";
  return conn.prepare(`SELECT * FROM ${safeTable} ORDER BY id DESC LIMIT ?`).all(limit);
}

function getCounts() {
  const conn = ensureDb();
  const q = (table) => conn.prepare(`SELECT COUNT(*) as n FROM ${table}`).get().n;
  return {
    activityCount: q("activities"),
    intentCount: q("intents"),
    contactCount: q("contacts"),
  };
}

module.exports = {
  ensureDb,
  insertActivity,
  insertIntent,
  insertContact,
  listRecent,
  getCounts,
};
