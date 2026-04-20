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

    CREATE TABLE IF NOT EXISTS community_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE,
      email TEXT,
      name TEXT,
      domain TEXT,
      current_goal TEXT,
      skill_level TEXT,
      repo_interest TEXT,
      source TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS onboarding_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id TEXT,
      question_key TEXT NOT NULL,
      question_label TEXT,
      answer_text TEXT,
      page TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, question_key),
      FOREIGN KEY(user_id) REFERENCES community_users(id)
    );

    CREATE TABLE IF NOT EXISTS user_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id TEXT,
      question_text TEXT NOT NULL,
      answer_summary TEXT,
      page TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES community_users(id)
    );
  `);
  return db;
}

function normalizeUserPayload(input = {}) {
  return {
    session_id: cleanText(input.session_id || input.sessionId || "", 240),
    email: cleanOptionalEmail(input.email || "") || "",
    name: cleanText(input.name || "", 160),
    domain: cleanText(input.domain || input.field || "", 160),
    current_goal: cleanText(input.current_goal || input.goal || input.intent || "", 320),
    skill_level: cleanText(input.skill_level || "", 120),
    repo_interest: cleanText(input.repo_interest || "", 200),
    source: cleanText(input.source || "", 120),
  };
}

function findCommunityUser(input = {}) {
  const conn = ensureDb();
  const email = cleanOptionalEmail(input.email || "") || "";
  const sessionId = cleanText(input.session_id || input.sessionId || "", 240);
  if (email) {
    const byEmail = conn.prepare(`SELECT * FROM community_users WHERE email = ? ORDER BY id DESC LIMIT 1`).get(email);
    if (byEmail) return byEmail;
  }
  if (sessionId) {
    return conn.prepare(`SELECT * FROM community_users WHERE session_id = ? LIMIT 1`).get(sessionId) || null;
  }
  return null;
}

function upsertCommunityUser(input = {}) {
  const conn = ensureDb();
  const payload = normalizeUserPayload(input);
  let user = findCommunityUser(payload);

  if (user) {
    const merged = {
      session_id: payload.session_id || user.session_id || "",
      email: payload.email || user.email || "",
      name: payload.name || user.name || "",
      domain: payload.domain || user.domain || "",
      current_goal: payload.current_goal || user.current_goal || "",
      skill_level: payload.skill_level || user.skill_level || "",
      repo_interest: payload.repo_interest || user.repo_interest || "",
      source: payload.source || user.source || "",
      id: user.id,
    };
    conn.prepare(`
      UPDATE community_users
      SET session_id = @session_id,
          email = @email,
          name = @name,
          domain = @domain,
          current_goal = @current_goal,
          skill_level = @skill_level,
          repo_interest = @repo_interest,
          source = @source,
          updated_at = datetime('now')
      WHERE id = @id
    `).run(merged);
    return getCommunityUserById(user.id);
  }

  const info = conn.prepare(`
    INSERT INTO community_users (session_id, email, name, domain, current_goal, skill_level, repo_interest, source)
    VALUES (@session_id, @email, @name, @domain, @current_goal, @skill_level, @repo_interest, @source)
  `).run(payload);
  return getCommunityUserById(info.lastInsertRowid);
}

function getCommunityUserById(id) {
  const conn = ensureDb();
  return conn.prepare(`SELECT * FROM community_users WHERE id = ? LIMIT 1`).get(id) || null;
}

function saveOnboardingAnswer(input = {}) {
  const conn = ensureDb();
  const userId = Number(input.user_id || input.userId || 0);
  if (!userId) throw new Error("user_id is required");
  conn.prepare(`
    INSERT INTO onboarding_answers (user_id, session_id, question_key, question_label, answer_text, page)
    VALUES (@user_id, @session_id, @question_key, @question_label, @answer_text, @page)
    ON CONFLICT(user_id, question_key) DO UPDATE SET
      session_id = excluded.session_id,
      question_label = excluded.question_label,
      answer_text = excluded.answer_text,
      page = excluded.page,
      updated_at = datetime('now')
  `).run({
    user_id: userId,
    session_id: cleanText(input.session_id || input.sessionId || "", 240),
    question_key: cleanText(input.question_key || input.questionKey || "", 120),
    question_label: cleanText(input.question_label || input.questionLabel || "", 240),
    answer_text: cleanText(input.answer_text || input.answerText || "", 4000),
    page: cleanText(input.page || "", 400),
  });
}

function listOnboardingAnswersForUser(userId) {
  const conn = ensureDb();
  return conn.prepare(`SELECT * FROM onboarding_answers WHERE user_id = ? ORDER BY id ASC`).all(userId);
}

function insertUserQuestion(input = {}) {
  const conn = ensureDb();
  const userId = Number(input.user_id || input.userId || 0);
  if (!userId) throw new Error("user_id is required");
  const info = conn.prepare(`
    INSERT INTO user_questions (user_id, session_id, question_text, answer_summary, page)
    VALUES (@user_id, @session_id, @question_text, @answer_summary, @page)
  `).run({
    user_id: userId,
    session_id: cleanText(input.session_id || input.sessionId || "", 240),
    question_text: cleanText(input.question_text || input.questionText || "", 4000),
    answer_summary: cleanText(input.answer_summary || input.answerSummary || "", 4000),
    page: cleanText(input.page || "", 400),
  });
  return { id: info.lastInsertRowid };
}

function listUserQuestionsForUser(userId) {
  const conn = ensureDb();
  return conn.prepare(`SELECT * FROM user_questions WHERE user_id = ? ORDER BY id DESC`).all(userId);
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
  const safeTable = ["activities", "intents", "contacts", "community_users", "user_questions"].includes(table)
    ? table
    : "activities";
  return conn.prepare(`SELECT * FROM ${safeTable} ORDER BY id DESC LIMIT ?`).all(limit);
}

function listCommunityUsersDetailed(limit = 50) {
  const conn = ensureDb();
  const users = conn.prepare(`SELECT * FROM community_users ORDER BY updated_at DESC, id DESC LIMIT ?`).all(limit);
  return users.map((user) => ({
    ...user,
    answers: listOnboardingAnswersForUser(user.id),
    questions: listUserQuestionsForUser(user.id),
    recentActivities: conn
      .prepare(`SELECT * FROM activities WHERE session_id = ? ORDER BY id DESC LIMIT 10`)
      .all(user.session_id || ""),
  }));
}

function getCounts() {
  const conn = ensureDb();
  const q = (table) => conn.prepare(`SELECT COUNT(*) as n FROM ${table}`).get().n;
  return {
    activityCount: q("activities"),
    intentCount: q("intents"),
    contactCount: q("contacts"),
    communityUserCount: q("community_users"),
    onboardingAnswerCount: q("onboarding_answers"),
    userQuestionCount: q("user_questions"),
  };
}

module.exports = {
  ensureDb,
  insertActivity,
  insertIntent,
  insertContact,
  findCommunityUser,
  upsertCommunityUser,
  getCommunityUserById,
  saveOnboardingAnswer,
  listOnboardingAnswersForUser,
  insertUserQuestion,
  listUserQuestionsForUser,
  listRecent,
  listCommunityUsersDetailed,
  getCounts,
};
