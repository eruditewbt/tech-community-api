"use strict";

const fs = require("fs");
const path = require("path");
let Database = null;
try {
  Database = require("better-sqlite3");
} catch (_) {
  Database = null;
}

const { DB_PATH } = require("./config");
const { cleanText, cleanOptionalEmail } = require("./http");

let db;
let mem;

function nowIso() {
  return new Date().toISOString();
}

function jsonDbPath() {
  return `${DB_PATH}.json`;
}

function emptyMem() {
  return {
    counters: {
      activities: 0,
      intents: 0,
      contacts: 0,
      community_users: 0,
      onboarding_answers: 0,
      user_questions: 0,
    },
    activities: [],
    intents: [],
    contacts: [],
    community_users: [],
    onboarding_answers: [],
    user_questions: [],
  };
}

function ensureMem() {
  if (mem) return mem;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  try {
    mem = JSON.parse(fs.readFileSync(jsonDbPath(), "utf8"));
  } catch (_) {
    mem = emptyMem();
  }
  return mem;
}

function persistMem() {
  if (!mem) return;
  fs.writeFileSync(jsonDbPath(), JSON.stringify(mem, null, 2), "utf8");
}

function nextId(table) {
  const store = ensureMem();
  store.counters[table] = Number(store.counters[table] || 0) + 1;
  return store.counters[table];
}

function sortDescById(items) {
  return items.slice().sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
}

function ensureDb() {
  if (!Database) return ensureMem();
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
  const email = cleanOptionalEmail(input.email || "") || "";
  const sessionId = cleanText(input.session_id || input.sessionId || "", 240);

  if (!Database) {
    const store = ensureMem();
    if (email) {
      const byEmail = sortDescById(store.community_users).find((user) => user.email === email);
      if (byEmail) return byEmail;
    }
    if (sessionId) {
      return store.community_users.find((user) => user.session_id === sessionId) || null;
    }
    return null;
  }

  const conn = ensureDb();
  if (email) {
    const byEmail = conn.prepare(`SELECT * FROM community_users WHERE email = ? ORDER BY id DESC LIMIT 1`).get(email);
    if (byEmail) return byEmail;
  }
  if (sessionId) {
    return conn.prepare(`SELECT * FROM community_users WHERE session_id = ? LIMIT 1`).get(sessionId) || null;
  }
  return null;
}

function getCommunityUserById(id) {
  if (!Database) {
    const store = ensureMem();
    return store.community_users.find((user) => Number(user.id) === Number(id)) || null;
  }
  const conn = ensureDb();
  return conn.prepare(`SELECT * FROM community_users WHERE id = ? LIMIT 1`).get(id) || null;
}

function upsertCommunityUser(input = {}) {
  const payload = normalizeUserPayload(input);
  let user = findCommunityUser(payload);

  if (!Database) {
    const store = ensureMem();
    const timestamp = nowIso();
    if (user) {
      Object.assign(user, {
        session_id: payload.session_id || user.session_id || "",
        email: payload.email || user.email || "",
        name: payload.name || user.name || "",
        domain: payload.domain || user.domain || "",
        current_goal: payload.current_goal || user.current_goal || "",
        skill_level: payload.skill_level || user.skill_level || "",
        repo_interest: payload.repo_interest || user.repo_interest || "",
        source: payload.source || user.source || "",
        updated_at: timestamp,
      });
      persistMem();
      return { ...user };
    }
    const created = {
      id: nextId("community_users"),
      ...payload,
      created_at: timestamp,
      updated_at: timestamp,
    };
    store.community_users.push(created);
    persistMem();
    return { ...created };
  }

  const conn = ensureDb();
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

function saveOnboardingAnswer(input = {}) {
  const userId = Number(input.user_id || input.userId || 0);
  if (!userId) throw new Error("user_id is required");

  const record = {
    user_id: userId,
    session_id: cleanText(input.session_id || input.sessionId || "", 240),
    question_key: cleanText(input.question_key || input.questionKey || "", 120),
    question_label: cleanText(input.question_label || input.questionLabel || "", 240),
    answer_text: cleanText(input.answer_text || input.answerText || "", 4000),
    page: cleanText(input.page || "", 400),
  };

  if (!Database) {
    const store = ensureMem();
    const timestamp = nowIso();
    const existing = store.onboarding_answers.find(
      (item) => Number(item.user_id) === userId && item.question_key === record.question_key
    );
    if (existing) {
      Object.assign(existing, record, { updated_at: timestamp });
      persistMem();
      return;
    }
    store.onboarding_answers.push({
      id: nextId("onboarding_answers"),
      ...record,
      created_at: timestamp,
      updated_at: timestamp,
    });
    persistMem();
    return;
  }

  const conn = ensureDb();
  conn.prepare(`
    INSERT INTO onboarding_answers (user_id, session_id, question_key, question_label, answer_text, page)
    VALUES (@user_id, @session_id, @question_key, @question_label, @answer_text, @page)
    ON CONFLICT(user_id, question_key) DO UPDATE SET
      session_id = excluded.session_id,
      question_label = excluded.question_label,
      answer_text = excluded.answer_text,
      page = excluded.page,
      updated_at = datetime('now')
  `).run(record);
}

function listOnboardingAnswersForUser(userId) {
  if (!Database) {
    const store = ensureMem();
    return store.onboarding_answers
      .filter((item) => Number(item.user_id) === Number(userId))
      .sort((a, b) => Number(a.id) - Number(b.id));
  }
  const conn = ensureDb();
  return conn.prepare(`SELECT * FROM onboarding_answers WHERE user_id = ? ORDER BY id ASC`).all(userId);
}

function insertUserQuestion(input = {}) {
  const userId = Number(input.user_id || input.userId || 0);
  if (!userId) throw new Error("user_id is required");
  const record = {
    user_id: userId,
    session_id: cleanText(input.session_id || input.sessionId || "", 240),
    question_text: cleanText(input.question_text || input.questionText || "", 4000),
    answer_summary: cleanText(input.answer_summary || input.answerSummary || "", 4000),
    page: cleanText(input.page || "", 400),
  };

  if (!Database) {
    const store = ensureMem();
    const created = {
      id: nextId("user_questions"),
      ...record,
      created_at: nowIso(),
    };
    store.user_questions.push(created);
    persistMem();
    return { id: created.id };
  }

  const conn = ensureDb();
  const info = conn.prepare(`
    INSERT INTO user_questions (user_id, session_id, question_text, answer_summary, page)
    VALUES (@user_id, @session_id, @question_text, @answer_summary, @page)
  `).run(record);
  return { id: info.lastInsertRowid };
}

function listUserQuestionsForUser(userId) {
  if (!Database) {
    const store = ensureMem();
    return sortDescById(store.user_questions).filter((item) => Number(item.user_id) === Number(userId));
  }
  const conn = ensureDb();
  return conn.prepare(`SELECT * FROM user_questions WHERE user_id = ? ORDER BY id DESC`).all(userId);
}

function insertActivity(input) {
  const record = {
    event_type: cleanText(input.event_type || "event", 120),
    page: cleanText(input.page || "", 400),
    label: cleanText(input.label || "", 240),
    href: cleanText(input.href || "", 1000),
    session_id: cleanText(input.session_id || "", 240),
    referrer: cleanText(input.referrer || "", 1000),
    payload_json: input.payload ? JSON.stringify(input.payload) : null,
  };

  if (!Database) {
    const store = ensureMem();
    const created = {
      id: nextId("activities"),
      ...record,
      created_at: nowIso(),
    };
    store.activities.push(created);
    persistMem();
    return { id: created.id };
  }

  const conn = ensureDb();
  const stmt = conn.prepare(`
    INSERT INTO activities (event_type, page, label, href, session_id, referrer, payload_json)
    VALUES (@event_type, @page, @label, @href, @session_id, @referrer, @payload_json)
  `);
  const info = stmt.run(record);
  return { id: info.lastInsertRowid };
}

function insertIntent(input) {
  const record = {
    name: cleanText(input.name || "", 160),
    email: cleanOptionalEmail(input.email || "") || "",
    field: cleanText(input.field || "", 160),
    intent: cleanText(input.intent || "", 500),
    skills: cleanText(input.skills || "", 2000),
    looking_for: cleanText(input.looking_for || "", 2000),
    source: cleanText(input.source || "", 120),
  };

  if (!Database) {
    const store = ensureMem();
    const created = { id: nextId("intents"), ...record, created_at: nowIso() };
    store.intents.push(created);
    persistMem();
    return { id: created.id };
  }

  const conn = ensureDb();
  const stmt = conn.prepare(`
    INSERT INTO intents (name, email, field, intent, skills, looking_for, source)
    VALUES (@name, @email, @field, @intent, @skills, @looking_for, @source)
  `);
  const info = stmt.run(record);
  return { id: info.lastInsertRowid };
}

function insertContact(input) {
  const record = {
    name: cleanText(input.name || "", 160),
    email: cleanOptionalEmail(input.email || "") || "",
    subject: cleanText(input.subject || "", 240),
    message: cleanText(input.message || "", 6000),
    source: cleanText(input.source || "", 120),
  };

  if (!Database) {
    const store = ensureMem();
    const created = { id: nextId("contacts"), ...record, created_at: nowIso() };
    store.contacts.push(created);
    persistMem();
    return { id: created.id };
  }

  const conn = ensureDb();
  const stmt = conn.prepare(`
    INSERT INTO contacts (name, email, subject, message, source)
    VALUES (@name, @email, @subject, @message, @source)
  `);
  const info = stmt.run(record);
  return { id: info.lastInsertRowid };
}

function listRecent(table, limit = 25) {
  const safeTable = ["activities", "intents", "contacts", "community_users", "user_questions"].includes(table)
    ? table
    : "activities";

  if (!Database) {
    const store = ensureMem();
    return sortDescById(store[safeTable]).slice(0, Number(limit) || 25);
  }

  const conn = ensureDb();
  return conn.prepare(`SELECT * FROM ${safeTable} ORDER BY id DESC LIMIT ?`).all(limit);
}

function listCommunityUsersDetailed(limit = 50) {
  if (!Database) {
    const store = ensureMem();
    return sortDescById(store.community_users)
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))
      .slice(0, Number(limit) || 50)
      .map((user) => ({
        ...user,
        answers: listOnboardingAnswersForUser(user.id),
        questions: listUserQuestionsForUser(user.id),
        recentActivities: sortDescById(store.activities)
          .filter((item) => item.session_id === (user.session_id || ""))
          .slice(0, 10),
      }));
  }

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
  if (!Database) {
    const store = ensureMem();
    return {
      activityCount: store.activities.length,
      intentCount: store.intents.length,
      contactCount: store.contacts.length,
      communityUserCount: store.community_users.length,
      onboardingAnswerCount: store.onboarding_answers.length,
      userQuestionCount: store.user_questions.length,
    };
  }

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
