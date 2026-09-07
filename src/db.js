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
      service_requests: 0,
      payment_links: 0,
      payments: 0,
      payment_proofs: 0,
      receipts: 0,
      ai_conversations: 0,
      ai_messages: 0,
    },
    activities: [],
    intents: [],
    contacts: [],
    community_users: [],
    onboarding_answers: [],
    user_questions: [],
    service_requests: [],
    payment_links: [],
    payments: [],
    payment_proofs: [],
    receipts: [],
    ai_conversations: [],
    ai_messages: [],
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
  const defaults = emptyMem();
  mem.counters = { ...defaults.counters, ...(mem.counters || {}) };
  for (const table of Object.keys(defaults).filter(
    (key) => key !== "counters",
  )) {
    if (!Array.isArray(mem[table])) mem[table] = [];
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
      owner_uid TEXT,
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
      owner_uid TEXT,
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

    CREATE TABLE IF NOT EXISTS service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_uid TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'normal',
      status TEXT NOT NULL DEFAULT 'SUBMITTED',
      payment_link_id INTEGER,
      payment_id INTEGER,
      conversation_id TEXT,
      assigned_to_uid TEXT,
      requested_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      idempotency_key TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS payment_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_slug TEXT UNIQUE NOT NULL,
      creator_uid TEXT NOT NULL,
      service_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      recipient_label TEXT,
      expires_at TEXT,
      status TEXT NOT NULL DEFAULT 'CREATED',
      share_url TEXT,
      creation_receipt_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      idempotency_key TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_link_id INTEGER NOT NULL,
      payer_uid TEXT NOT NULL,
      creator_uid TEXT,
      provider TEXT NOT NULL DEFAULT 'manual',
      provider_transaction_id TEXT,
      provider_reference TEXT,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'PAYMENT_PENDING',
      initiated_at TEXT NOT NULL DEFAULT (datetime('now')),
      confirmed_at TEXT,
      resolved_by_uid TEXT,
      resolution_note TEXT,
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_proofs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      payer_uid TEXT NOT NULL,
      proof_reference TEXT NOT NULL,
      proof_note TEXT,
      object_key TEXT,
      idempotency_key TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(payment_id) REFERENCES payments(id)
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      owner_uid TEXT,
      type TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      summary TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      amount REAL,
      currency TEXT,
      verification_state TEXT NOT NULL DEFAULT 'UNVERIFIED',
      payload_json TEXT,
      qr_code TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_uid TEXT NOT NULL,
      title TEXT NOT NULL,
      purpose TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      consent_flags TEXT,
      provider TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      context_links TEXT,
      provider_request_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(conversation_id) REFERENCES ai_conversations(id)
    );
  `);
  try {
    db.exec("ALTER TABLE community_users ADD COLUMN owner_uid TEXT");
  } catch (_) {
    // Column already exists on migrated databases.
  }
  try {
    db.exec("ALTER TABLE activities ADD COLUMN owner_uid TEXT");
  } catch (_) {
    // Column already exists on migrated databases.
  }
  try {
    db.exec("ALTER TABLE payment_proofs ADD COLUMN idempotency_key TEXT");
  } catch (_) {
    // Column already exists on migrated databases.
  }
  try {
    db.exec("ALTER TABLE service_requests ADD COLUMN idempotency_key TEXT");
  } catch (_) {}
  try {
    db.exec("ALTER TABLE payment_links ADD COLUMN idempotency_key TEXT");
  } catch (_) {}
  return db;
}

function normalizeUserPayload(input = {}) {
  return {
    owner_uid: cleanText(input.owner_uid || input.ownerUid || "", 180),
    session_id: cleanText(input.session_id || input.sessionId || "", 240),
    email: cleanOptionalEmail(input.email || "") || "",
    name: cleanText(input.name || "", 160),
    domain: cleanText(input.domain || input.field || "", 160),
    current_goal: cleanText(
      input.current_goal || input.goal || input.intent || "",
      320,
    ),
    skill_level: cleanText(input.skill_level || "", 120),
    repo_interest: cleanText(input.repo_interest || "", 200),
    source: cleanText(input.source || "", 120),
  };
}

function findCommunityUser(input = {}) {
  const email = cleanOptionalEmail(input.email || "") || "";
  const sessionId = cleanText(input.session_id || input.sessionId || "", 240);
  const ownerUid = cleanText(input.owner_uid || input.ownerUid || "", 180);

  if (!Database) {
    const store = ensureMem();
    if (email) {
      const byEmail = sortDescById(store.community_users).find(
        (user) => user.email === email,
      );
      if (byEmail) return byEmail;
    }
    if (ownerUid) {
      const byOwner = sortDescById(store.community_users).find(
        (user) => user.owner_uid === ownerUid,
      );
      if (byOwner) return byOwner;
    }
    if (sessionId) {
      return (
        store.community_users.find((user) => user.session_id === sessionId) ||
        null
      );
    }
    return null;
  }

  const conn = ensureDb();
  if (ownerUid) {
    const byOwner = conn
      .prepare(
        `SELECT * FROM community_users WHERE owner_uid = ? ORDER BY id DESC LIMIT 1`,
      )
      .get(ownerUid);
    if (byOwner) return byOwner;
  }
  if (email) {
    const byEmail = conn
      .prepare(
        `SELECT * FROM community_users WHERE email = ? ORDER BY id DESC LIMIT 1`,
      )
      .get(email);
    if (byEmail) return byEmail;
  }
  if (sessionId) {
    return (
      conn
        .prepare(`SELECT * FROM community_users WHERE session_id = ? LIMIT 1`)
        .get(sessionId) || null
    );
  }
  return null;
}

function getCommunityUserById(id) {
  if (!Database) {
    const store = ensureMem();
    return (
      store.community_users.find((user) => Number(user.id) === Number(id)) ||
      null
    );
  }
  const conn = ensureDb();
  return (
    conn
      .prepare(`SELECT * FROM community_users WHERE id = ? LIMIT 1`)
      .get(id) || null
  );
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
        owner_uid: payload.owner_uid || user.owner_uid || "",
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
      owner_uid: payload.owner_uid || user.owner_uid || "",
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
    conn
      .prepare(
        `
      UPDATE community_users
      SET owner_uid = @owner_uid,
          session_id = @session_id,
          email = @email,
          name = @name,
          domain = @domain,
          current_goal = @current_goal,
          skill_level = @skill_level,
          repo_interest = @repo_interest,
          source = @source,
          updated_at = datetime('now')
      WHERE id = @id
    `,
      )
      .run(merged);
    return getCommunityUserById(user.id);
  }

  const info = conn
    .prepare(
      `
    INSERT INTO community_users (owner_uid, session_id, email, name, domain, current_goal, skill_level, repo_interest, source)
    VALUES (@owner_uid, @session_id, @email, @name, @domain, @current_goal, @skill_level, @repo_interest, @source)
  `,
    )
    .run(payload);
  return getCommunityUserById(info.lastInsertRowid);
}

function saveOnboardingAnswer(input = {}) {
  const userId = Number(input.user_id || input.userId || 0);
  if (!userId) throw new Error("user_id is required");

  const record = {
    user_id: userId,
    session_id: cleanText(input.session_id || input.sessionId || "", 240),
    question_key: cleanText(input.question_key || input.questionKey || "", 120),
    question_label: cleanText(
      input.question_label || input.questionLabel || "",
      240,
    ),
    answer_text: cleanText(input.answer_text || input.answerText || "", 4000),
    page: cleanText(input.page || "", 400),
  };

  if (!Database) {
    const store = ensureMem();
    const timestamp = nowIso();
    const existing = store.onboarding_answers.find(
      (item) =>
        Number(item.user_id) === userId &&
        item.question_key === record.question_key,
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
  conn
    .prepare(
      `
    INSERT INTO onboarding_answers (user_id, session_id, question_key, question_label, answer_text, page)
    VALUES (@user_id, @session_id, @question_key, @question_label, @answer_text, @page)
    ON CONFLICT(user_id, question_key) DO UPDATE SET
      session_id = excluded.session_id,
      question_label = excluded.question_label,
      answer_text = excluded.answer_text,
      page = excluded.page,
      updated_at = datetime('now')
  `,
    )
    .run(record);
}

function listOnboardingAnswersForUser(userId) {
  if (!Database) {
    const store = ensureMem();
    return store.onboarding_answers
      .filter((item) => Number(item.user_id) === Number(userId))
      .sort((a, b) => Number(a.id) - Number(b.id));
  }
  const conn = ensureDb();
  return conn
    .prepare(
      `SELECT * FROM onboarding_answers WHERE user_id = ? ORDER BY id ASC`,
    )
    .all(userId);
}

function insertUserQuestion(input = {}) {
  const userId = Number(input.user_id || input.userId || 0);
  if (!userId) throw new Error("user_id is required");
  const record = {
    user_id: userId,
    session_id: cleanText(input.session_id || input.sessionId || "", 240),
    question_text: cleanText(
      input.question_text || input.questionText || "",
      4000,
    ),
    answer_summary: cleanText(
      input.answer_summary || input.answerSummary || "",
      4000,
    ),
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
  const info = conn
    .prepare(
      `
    INSERT INTO user_questions (user_id, session_id, question_text, answer_summary, page)
    VALUES (@user_id, @session_id, @question_text, @answer_summary, @page)
  `,
    )
    .run(record);
  return { id: info.lastInsertRowid };
}

function listUserQuestionsForUser(userId) {
  if (!Database) {
    const store = ensureMem();
    return sortDescById(store.user_questions).filter(
      (item) => Number(item.user_id) === Number(userId),
    );
  }
  const conn = ensureDb();
  return conn
    .prepare(`SELECT * FROM user_questions WHERE user_id = ? ORDER BY id DESC`)
    .all(userId);
}

function insertActivity(input) {
  const record = {
    event_type: cleanText(input.event_type || "event", 120),
    page: cleanText(input.page || "", 400),
    label: cleanText(input.label || "", 240),
    href: cleanText(input.href || "", 1000),
    session_id: cleanText(input.session_id || "", 240),
    owner_uid: cleanText(input.owner_uid || input.ownerUid || "", 180),
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
    INSERT INTO activities (event_type, page, label, href, session_id, owner_uid, referrer, payload_json)
    VALUES (@event_type, @page, @label, @href, @session_id, @owner_uid, @referrer, @payload_json)
  `);
  const info = stmt.run(record);
  return { id: info.lastInsertRowid };
}

function listActivitiesForUser(ownerUid, limit = 50) {
  const safeOwner = cleanText(ownerUid || "", 180);
  if (!safeOwner) return [];
  if (!Database) {
    const store = ensureMem();
    return sortDescById(store.activities)
      .filter((item) => item.owner_uid === safeOwner)
      .slice(0, Number(limit) || 50);
  }
  const conn = ensureDb();
  return conn
    .prepare(
      `SELECT * FROM activities WHERE owner_uid = ? ORDER BY id DESC LIMIT ?`,
    )
    .all(safeOwner, Number(limit) || 50);
}

function getParticipationSummary(ownerUid) {
  const safeOwner = cleanText(ownerUid || "", 180);
  if (!safeOwner) return { score: 0, level: "New", categories: {}, totals: {} };
  const activities = listActivitiesForUser(safeOwner, 5000);
  const serviceRequests = listServiceRequestsForUser(safeOwner);
  const paymentLinks = listPaymentLinksForUser(safeOwner);
  const receipts = listReceiptsForUser(safeOwner);
  const conversations = listAiConversationsForUser(safeOwner);
  const visits = activities.filter(
    (item) => item.event_type === "page_view",
  ).length;
  const contributions = activities.filter((item) =>
    [
      "intent_submit",
      "contact_submit",
      "project.created",
      "deliverable.created",
    ].includes(item.event_type),
  ).length;
  const proofReceipts = receipts.filter((item) =>
    [
      "PAYMENT_PROOF_SUBMITTED",
      "PAYMENT_PROVIDER_CONFIRMED",
      "PAYMENT_MANUALLY_RESOLVED",
    ].includes(item.type),
  ).length;
  const categories = {
    visits: Math.min(visits * 2, 30),
    learning: Math.min(
      activities.filter((item) =>
        /learn|course|onboarding/i.test(item.event_type || ""),
      ).length * 3,
      30,
    ),
    requests: Math.min(serviceRequests.length * 10, 40),
    conversations: Math.min(conversations.length * 8, 32),
    payments: Math.min(paymentLinks.length * 6 + proofReceipts * 8, 40),
    contributions: Math.min(contributions * 8, 40),
  };
  const score = Object.values(categories).reduce(
    (total, value) => total + value,
    0,
  );
  const level =
    score >= 120
      ? "Steward"
      : score >= 80
        ? "Builder"
        : score >= 40
          ? "Participant"
          : score > 0
            ? "Explorer"
            : "New";
  return {
    score,
    level,
    categories,
    totals: {
      visits,
      serviceRequests: serviceRequests.length,
      paymentLinks: paymentLinks.length,
      proofReceipts,
      conversations: conversations.length,
      contributions,
      activities: activities.length,
    },
  };
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
  const safeTable = [
    "activities",
    "intents",
    "contacts",
    "community_users",
    "user_questions",
  ].includes(table)
    ? table
    : "activities";

  if (!Database) {
    const store = ensureMem();
    return sortDescById(store[safeTable]).slice(0, Number(limit) || 25);
  }

  const conn = ensureDb();
  return conn
    .prepare(`SELECT * FROM ${safeTable} ORDER BY id DESC LIMIT ?`)
    .all(limit);
}

function listCommunityUsersDetailed(limit = 50) {
  if (!Database) {
    const store = ensureMem();
    return sortDescById(store.community_users)
      .sort((a, b) =>
        String(b.updated_at || "").localeCompare(String(a.updated_at || "")),
      )
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
  const users = conn
    .prepare(
      `SELECT * FROM community_users ORDER BY updated_at DESC, id DESC LIMIT ?`,
    )
    .all(limit);
  return users.map((user) => ({
    ...user,
    answers: listOnboardingAnswersForUser(user.id),
    questions: listUserQuestionsForUser(user.id),
    recentActivities: conn
      .prepare(
        `SELECT * FROM activities WHERE session_id = ? ORDER BY id DESC LIMIT 10`,
      )
      .all(user.session_id || ""),
  }));
}

function generateReceiptNumber(prefix = "RCP") {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

function slugify(value, fallback = "item") {
  const cleaned = String(value || fallback || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return cleaned || fallback;
}

function insertReceipt(input = {}) {
  const record = {
    receipt_number: cleanText(
      input.receipt_number ||
        input.receiptNumber ||
        generateReceiptNumber("RCP"),
      120,
    ),
    owner_uid: cleanText(input.owner_uid || input.ownerUid || "", 180),
    type: cleanText(input.type || "RECEIPT", 120),
    entity_type: cleanText(input.entity_type || input.entityType || "", 80),
    entity_id: Number(input.entity_id || input.entityId || 0) || null,
    summary: cleanText(input.summary || "Receipt created.", 2000),
    status: cleanText(input.status || "PENDING", 60),
    amount: Number(input.amount || 0) || 0,
    currency: cleanText(input.currency || "USD", 12),
    verification_state: cleanText(
      input.verification_state || input.verificationState || "UNVERIFIED",
      80,
    ),
    payload_json:
      input.payload_json || input.payloadJson
        ? JSON.stringify(input.payload_json || input.payloadJson)
        : null,
    qr_code: cleanText(input.qr_code || input.qrCode || "", 2000),
  };

  if (!Database) {
    const store = ensureMem();
    const created = {
      id: nextId("receipts"),
      ...record,
      created_at: nowIso(),
    };
    store.receipts.push(created);
    persistMem();
    return { ...created };
  }

  const conn = ensureDb();
  const info = conn
    .prepare(
      `
    INSERT INTO receipts (
      receipt_number,
      owner_uid,
      type,
      entity_type,
      entity_id,
      summary,
      status,
      amount,
      currency,
      verification_state,
      payload_json,
      qr_code
    ) VALUES (
      @receipt_number,
      @owner_uid,
      @type,
      @entity_type,
      @entity_id,
      @summary,
      @status,
      @amount,
      @currency,
      @verification_state,
      @payload_json,
      @qr_code
    )
  `,
    )
    .run(record);
  return conn
    .prepare(`SELECT * FROM receipts WHERE id = ? LIMIT 1`)
    .get(info.lastInsertRowid);
}

function insertServiceRequest(input = {}) {
  const record = {
    owner_uid: cleanText(input.owner_uid || input.ownerUid || "", 180),
    type: cleanText(input.type || "general", 80),
    title: cleanText(input.title || "Service request", 220),
    description: cleanText(input.description || "", 6000),
    priority: cleanText(input.priority || "normal", 40),
    status: cleanText(input.status || "SUBMITTED", 40),
    payment_link_id:
      Number(input.payment_link_id || input.paymentLinkId || 0) || null,
    payment_id: Number(input.payment_id || input.paymentId || 0) || null,
    conversation_id: cleanText(
      input.conversation_id || input.conversationId || "",
      180,
    ),
    assigned_to_uid: cleanText(
      input.assigned_to_uid || input.assignedToUid || "",
      180,
    ),
    requested_at: input.requested_at || input.requestedAt || nowIso(),
    updated_at: input.updated_at || input.updatedAt || nowIso(),
    completed_at: input.completed_at || input.completedAt || null,
    idempotency_key:
      cleanText(input.idempotency_key || input.idempotencyKey || "", 240) ||
      null,
  };

  if (!Database) {
    const store = ensureMem();
    const existing =
      record.idempotency_key &&
      store.service_requests.find(
        (item) => item.idempotency_key === record.idempotency_key,
      );
    if (existing) return { ...existing };
    const created = {
      id: nextId("service_requests"),
      ...record,
      completed_at: record.completed_at,
    };
    store.service_requests.push(created);
    persistMem();
    return { ...created };
  }

  const conn = ensureDb();
  const info = conn
    .prepare(
      `
    INSERT INTO service_requests (
      owner_uid,
      type,
      title,
      description,
      priority,
      status,
      payment_link_id,
      payment_id,
      conversation_id,
      assigned_to_uid,
      requested_at,
      updated_at,
      completed_at,
      idempotency_key
    ) VALUES (
      @owner_uid,
      @type,
      @title,
      @description,
      @priority,
      @status,
      @payment_link_id,
      @payment_id,
      @conversation_id,
      @assigned_to_uid,
      @requested_at,
      @updated_at,
      @completed_at,
      @idempotency_key
    )
  `,
    )
    .run(record);
  return conn
    .prepare(`SELECT * FROM service_requests WHERE id = ? LIMIT 1`)
    .get(info.lastInsertRowid);
}

function listServiceRequestsForUser(ownerUid) {
  const safeOwner = cleanText(ownerUid || "", 180);
  if (!safeOwner) return [];
  if (!Database) {
    const store = ensureMem();
    return sortDescById(store.service_requests).filter(
      (item) => item.owner_uid === safeOwner,
    );
  }
  const conn = ensureDb();
  return conn
    .prepare(
      `SELECT * FROM service_requests WHERE owner_uid = ? ORDER BY id DESC`,
    )
    .all(safeOwner);
}

function insertPaymentLink(input = {}) {
  const creatorUid = cleanText(
    input.creator_uid || input.creatorUid || "",
    180,
  );
  if (!creatorUid) throw new Error("creator_uid is required");

  const amount = Number(input.amount || 0);
  const slugSource = cleanText(
    input.public_slug ||
      input.publicSlug ||
      `${slugify(input.service_type || input.serviceType || "payment")}-${Date.now().toString(36)}`,
    80,
  );
  const publicSlug =
    slugSource ||
    `${slugify(input.title || "payment")}-${Date.now().toString(36)}`;
  const shareUrl = cleanText(
    input.share_url ||
      input.shareUrl ||
      `https://eruditewbt.github.io/Tech_Community_by_EruditeWBT/payment.html?slug=${encodeURIComponent(publicSlug)}`,
    1000,
  );
  const record = {
    public_slug: publicSlug,
    creator_uid: creatorUid,
    service_type: cleanText(
      input.service_type || input.serviceType || "general",
      80,
    ),
    title: cleanText(input.title || "Payment link", 220),
    description: cleanText(input.description || "", 6000),
    amount: Number.isFinite(amount) ? amount : 0,
    currency: cleanText(input.currency || "USD", 12),
    recipient_label: cleanText(
      input.recipient_label || input.recipientLabel || "EruditeWBT",
      120,
    ),
    expires_at: input.expires_at || input.expiresAt || null,
    status: cleanText(input.status || "CREATED", 40),
    share_url: shareUrl,
    creation_receipt_id:
      Number(input.creation_receipt_id || input.creationReceiptId || 0) || null,
    idempotency_key:
      cleanText(input.idempotency_key || input.idempotencyKey || "", 240) ||
      null,
  };

  if (!Database) {
    const store = ensureMem();
    const existing =
      record.idempotency_key &&
      store.payment_links.find(
        (item) => item.idempotency_key === record.idempotency_key,
      );
    if (existing) return { ...existing };
    const created = {
      id: nextId("payment_links"),
      ...record,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    store.payment_links.push(created);
    persistMem();
    return { ...created };
  }

  const conn = ensureDb();
  const info = conn
    .prepare(
      `
    INSERT INTO payment_links (
      public_slug,
      creator_uid,
      service_type,
      title,
      description,
      amount,
      currency,
      recipient_label,
      expires_at,
      status,
      share_url,
      creation_receipt_id,
      idempotency_key
    ) VALUES (
      @public_slug,
      @creator_uid,
      @service_type,
      @title,
      @description,
      @amount,
      @currency,
      @recipient_label,
      @expires_at,
      @status,
      @share_url,
      @creation_receipt_id,
      @idempotency_key
    )
  `,
    )
    .run(record);
  return conn
    .prepare(`SELECT * FROM payment_links WHERE id = ? LIMIT 1`)
    .get(info.lastInsertRowid);
}

function attachPaymentLinkReceipt(paymentLinkId, receiptId) {
  const linkId = Number(paymentLinkId || 0);
  const receipt = Number(receiptId || 0);
  if (!linkId || !receipt) return null;
  if (!Database) {
    const store = ensureMem();
    const item = store.payment_links.find((link) => Number(link.id) === linkId);
    if (!item) return null;
    item.creation_receipt_id = receipt;
    item.updated_at = nowIso();
    persistMem();
    return { ...item };
  }
  const conn = ensureDb();
  if (record.idempotency_key) {
    const existing = conn
      .prepare(`SELECT * FROM payment_links WHERE idempotency_key = ? LIMIT 1`)
      .get(record.idempotency_key);
    if (existing) return existing;
  }
  conn
    .prepare(
      `UPDATE payment_links SET creation_receipt_id = ?, updated_at = datetime('now') WHERE id = ?`,
    )
    .run(receipt, linkId);
  return (
    conn
      .prepare(`SELECT * FROM payment_links WHERE id = ? LIMIT 1`)
      .get(linkId) || null
  );
}

function listPaymentLinksForUser(ownerUid) {
  const safeOwner = cleanText(ownerUid || "", 180);
  if (!safeOwner) return [];
  if (!Database) {
    const store = ensureMem();
    return sortDescById(store.payment_links).filter(
      (item) => item.creator_uid === safeOwner,
    );
  }
  const conn = ensureDb();
  return conn
    .prepare(
      `SELECT * FROM payment_links WHERE creator_uid = ? ORDER BY id DESC`,
    )
    .all(safeOwner);
}

function insertPayment(input = {}) {
  const record = {
    payment_link_id: Number(input.payment_link_id || input.paymentLinkId || 0),
    payer_uid: cleanText(input.payer_uid || input.payerUid || "", 180),
    creator_uid: cleanText(input.creator_uid || input.creatorUid || "", 180),
    provider: cleanText(input.provider || "manual", 80),
    provider_transaction_id: cleanText(
      input.provider_transaction_id || input.providerTransactionId || "",
      240,
    ),
    provider_reference: cleanText(
      input.provider_reference || input.providerReference || "",
      240,
    ),
    amount: Number(input.amount || 0) || 0,
    currency: cleanText(input.currency || "USD", 12),
    status: cleanText(input.status || "PAYMENT_PENDING", 60),
    idempotency_key:
      cleanText(input.idempotency_key || input.idempotencyKey || "", 240) ||
      null,
  };
  if (!record.payment_link_id || !record.payer_uid)
    throw new Error("payment_link_id and payer_uid are required");
  if (!Database) {
    const store = ensureMem();
    const existing =
      record.idempotency_key &&
      store.payments.find(
        (item) => item.idempotency_key === record.idempotency_key,
      );
    if (existing) return { ...existing };
    const created = {
      id: nextId("payments"),
      ...record,
      initiated_at: nowIso(),
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    store.payments.push(created);
    persistMem();
    return { ...created };
  }
  const conn = ensureDb();
  if (record.idempotency_key) {
    const existing = conn
      .prepare(`SELECT * FROM payments WHERE idempotency_key = ? LIMIT 1`)
      .get(record.idempotency_key);
    if (existing) return existing;
  }
  const info = conn
    .prepare(
      `INSERT INTO payments (payment_link_id, payer_uid, creator_uid, provider, provider_transaction_id, provider_reference, amount, currency, status, idempotency_key) VALUES (@payment_link_id, @payer_uid, @creator_uid, @provider, @provider_transaction_id, @provider_reference, @amount, @currency, @status, @idempotency_key)`,
    )
    .run(record);
  return conn
    .prepare(`SELECT * FROM payments WHERE id = ? LIMIT 1`)
    .get(info.lastInsertRowid);
}

function insertPaymentProof(input = {}) {
  const record = {
    payment_id: Number(input.payment_id || input.paymentId || 0),
    payer_uid: cleanText(input.payer_uid || input.payerUid || "", 180),
    proof_reference: cleanText(
      input.proof_reference || input.proofReference || "",
      500,
    ),
    proof_note: cleanText(input.proof_note || input.proofNote || "", 4000),
    object_key: cleanText(input.object_key || input.objectKey || "", 500),
    idempotency_key:
      cleanText(input.idempotency_key || input.idempotencyKey || "", 240) ||
      null,
    status: cleanText(input.status || "PENDING_REVIEW", 60),
  };
  if (!record.payment_id || !record.payer_uid || !record.proof_reference)
    throw new Error("payment_id, payer_uid, and proof_reference are required");
  if (!Database) {
    const store = ensureMem();
    const existing =
      record.idempotency_key &&
      store.payment_proofs.find(
        (item) => item.idempotency_key === record.idempotency_key,
      );
    if (existing) return { ...existing };
    const created = {
      id: nextId("payment_proofs"),
      ...record,
      created_at: nowIso(),
    };
    store.payment_proofs.push(created);
    persistMem();
    return { ...created };
  }
  const conn = ensureDb();
  if (record.idempotency_key) {
    const existing = conn
      .prepare(`SELECT * FROM payment_proofs WHERE idempotency_key = ? LIMIT 1`)
      .get(record.idempotency_key);
    if (existing) return existing;
  }
  const info = conn
    .prepare(
      `INSERT INTO payment_proofs (payment_id, payer_uid, proof_reference, proof_note, object_key, idempotency_key, status) VALUES (@payment_id, @payer_uid, @proof_reference, @proof_note, @object_key, @idempotency_key, @status)`,
    )
    .run(record);
  return conn
    .prepare(`SELECT * FROM payment_proofs WHERE id = ? LIMIT 1`)
    .get(info.lastInsertRowid);
}

function findPaymentProofByIdempotency(idempotencyKey, payerUid) {
  const key = cleanText(idempotencyKey || "", 240);
  const owner = cleanText(payerUid || "", 180);
  if (!key || !owner) return null;
  if (!Database) {
    const store = ensureMem();
    return (
      store.payment_proofs.find(
        (item) => item.idempotency_key === key && item.payer_uid === owner,
      ) || null
    );
  }
  const conn = ensureDb();
  return (
    conn
      .prepare(
        `SELECT * FROM payment_proofs WHERE idempotency_key = ? AND payer_uid = ? LIMIT 1`,
      )
      .get(key, owner) || null
  );
}

function findReceiptForEntity(ownerUid, type, entityType, entityId) {
  const owner = cleanText(ownerUid || "", 180);
  const receiptType = cleanText(type || "", 120);
  const targetType = cleanText(entityType || "", 80);
  const targetId = Number(entityId || 0);
  if (!owner || !receiptType || !targetType || !targetId) return null;
  if (!Database) {
    const store = ensureMem();
    return (
      sortDescById(store.receipts).find(
        (item) =>
          item.owner_uid === owner &&
          item.type === receiptType &&
          item.entity_type === targetType &&
          Number(item.entity_id) === targetId,
      ) || null
    );
  }
  const conn = ensureDb();
  return (
    conn
      .prepare(
        `SELECT * FROM receipts WHERE owner_uid = ? AND type = ? AND entity_type = ? AND entity_id = ? ORDER BY id DESC LIMIT 1`,
      )
      .get(owner, receiptType, targetType, targetId) || null
  );
}

function listPendingPayments() {
  if (!Database) {
    const store = ensureMem();
    return sortDescById(store.payments)
      .filter((payment) =>
        ["PAYMENT_PENDING", "PENDING_REVIEW"].includes(payment.status),
      )
      .map((payment) => ({
        ...payment,
        proofs: store.payment_proofs.filter(
          (proof) => Number(proof.payment_id) === Number(payment.id),
        ),
      }));
  }
  const conn = ensureDb();
  const payments = conn
    .prepare(
      `SELECT * FROM payments WHERE status IN ('PAYMENT_PENDING', 'PENDING_REVIEW') ORDER BY id DESC`,
    )
    .all();
  return payments.map((payment) => ({
    ...payment,
    proofs: conn
      .prepare(
        `SELECT * FROM payment_proofs WHERE payment_id = ? ORDER BY id DESC`,
      )
      .all(payment.id),
  }));
}

function resolvePayment(input = {}) {
  const paymentId = Number(input.payment_id || input.paymentId || 0);
  const status = cleanText(input.status || "MANUALLY_RESOLVED", 60);
  const resolverUid = cleanText(
    input.resolved_by_uid || input.resolvedByUid || "",
    180,
  );
  const note = cleanText(
    input.resolution_note || input.resolutionNote || "",
    4000,
  );
  if (!paymentId || !resolverUid)
    throw new Error("payment_id and resolved_by_uid are required");
  if (!Database) {
    const store = ensureMem();
    const payment = store.payments.find(
      (item) => Number(item.id) === paymentId,
    );
    if (!payment) return null;
    Object.assign(payment, {
      status,
      resolved_by_uid: resolverUid,
      resolution_note: note,
      confirmed_at: nowIso(),
      updated_at: nowIso(),
    });
    persistMem();
    return { ...payment };
  }
  const conn = ensureDb();
  conn
    .prepare(
      `UPDATE payments SET status = ?, resolved_by_uid = ?, resolution_note = ?, confirmed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
    )
    .run(status, resolverUid, note, paymentId);
  return (
    conn
      .prepare(`SELECT * FROM payments WHERE id = ? LIMIT 1`)
      .get(paymentId) || null
  );
}

function listReceiptsForUser(ownerUid) {
  const safeOwner = cleanText(ownerUid || "", 180);
  if (!safeOwner) return [];
  if (!Database) {
    const store = ensureMem();
    return sortDescById(store.receipts).filter(
      (item) => item.owner_uid === safeOwner,
    );
  }
  const conn = ensureDb();
  return conn
    .prepare(`SELECT * FROM receipts WHERE owner_uid = ? ORDER BY id DESC`)
    .all(safeOwner);
}

function getReceiptById(id) {
  const receiptId = Number(id || 0);
  if (!receiptId) return null;
  if (!Database) {
    const store = ensureMem();
    return store.receipts.find((item) => Number(item.id) === receiptId) || null;
  }
  return (
    ensureDb()
      .prepare(`SELECT * FROM receipts WHERE id = ? LIMIT 1`)
      .get(receiptId) || null
  );
}

function getPaymentLinkBySlug(publicSlug) {
  const slug = cleanText(publicSlug || "", 80);
  if (!slug) return null;
  if (!Database) {
    const store = ensureMem();
    return (
      store.payment_links.find((item) => item.public_slug === slug) || null
    );
  }
  const conn = ensureDb();
  return (
    conn
      .prepare(`SELECT * FROM payment_links WHERE public_slug = ? LIMIT 1`)
      .get(slug) || null
  );
}

function insertAiConversation(input = {}) {
  const record = {
    owner_uid: cleanText(input.owner_uid || input.ownerUid || "", 180),
    title: cleanText(input.title || "AI conversation", 220),
    purpose: cleanText(input.purpose || "", 800),
    status: cleanText(input.status || "OPEN", 40),
    consent_flags: cleanText(
      input.consent_flags || input.consentFlags || "",
      1200,
    ),
    provider: cleanText(input.provider || "intelligentsia", 80),
    metadata_json:
      input.metadata_json || input.metadataJson
        ? JSON.stringify(input.metadata_json || input.metadataJson)
        : null,
  };

  if (!Database) {
    const store = ensureMem();
    const created = {
      id: nextId("ai_conversations"),
      ...record,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    store.ai_conversations.push(created);
    persistMem();
    return { ...created };
  }

  const conn = ensureDb();
  const info = conn
    .prepare(
      `
    INSERT INTO ai_conversations (owner_uid, title, purpose, status, consent_flags, provider, metadata_json)
    VALUES (@owner_uid, @title, @purpose, @status, @consent_flags, @provider, @metadata_json)
  `,
    )
    .run(record);
  return conn
    .prepare(`SELECT * FROM ai_conversations WHERE id = ? LIMIT 1`)
    .get(info.lastInsertRowid);
}

function insertAiMessage(input = {}) {
  const record = {
    conversation_id: Number(input.conversation_id || input.conversationId || 0),
    role: cleanText(input.role || "user", 40),
    content: cleanText(input.content || "", 12000),
    context_links:
      input.context_links || input.contextLinks
        ? JSON.stringify(input.context_links || input.contextLinks)
        : null,
    provider_request_id: cleanText(
      input.provider_request_id || input.providerRequestId || "",
      240,
    ),
  };

  if (!record.conversation_id) throw new Error("conversation_id is required");

  if (!Database) {
    const store = ensureMem();
    const created = {
      id: nextId("ai_messages"),
      ...record,
      created_at: nowIso(),
    };
    store.ai_messages.push(created);
    persistMem();
    return { ...created };
  }

  const conn = ensureDb();
  const info = conn
    .prepare(
      `
    INSERT INTO ai_messages (conversation_id, role, content, context_links, provider_request_id)
    VALUES (@conversation_id, @role, @content, @context_links, @provider_request_id)
  `,
    )
    .run(record);
  return conn
    .prepare(`SELECT * FROM ai_messages WHERE id = ? LIMIT 1`)
    .get(info.lastInsertRowid);
}

function listAiConversationsForUser(ownerUid) {
  const safeOwner = cleanText(ownerUid || "", 180);
  if (!safeOwner) return [];
  if (!Database) {
    const store = ensureMem();
    return sortDescById(store.ai_conversations).filter(
      (item) => item.owner_uid === safeOwner,
    );
  }
  const conn = ensureDb();
  return conn
    .prepare(
      `SELECT * FROM ai_conversations WHERE owner_uid = ? ORDER BY id DESC`,
    )
    .all(safeOwner);
}

function getAiConversationForUser(conversationId, ownerUid) {
  const id = Number(conversationId || 0);
  const safeOwner = cleanText(ownerUid || "", 180);
  if (!id || !safeOwner) return null;
  if (!Database) {
    const store = ensureMem();
    return (
      store.ai_conversations.find(
        (item) => Number(item.id) === id && item.owner_uid === safeOwner,
      ) || null
    );
  }
  const conn = ensureDb();
  return (
    conn
      .prepare(
        `SELECT * FROM ai_conversations WHERE id = ? AND owner_uid = ? LIMIT 1`,
      )
      .get(id, safeOwner) || null
  );
}

function listAiMessagesForConversation(conversationId) {
  const id = Number(conversationId || 0);
  if (!id) return [];
  if (!Database) {
    const store = ensureMem();
    return sortDescById(store.ai_messages).filter(
      (item) => Number(item.conversation_id) === id,
    );
  }
  const conn = ensureDb();
  return conn
    .prepare(
      `SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY id ASC`,
    )
    .all(id);
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
      serviceRequestCount: store.service_requests.length,
      paymentLinkCount: store.payment_links.length,
      paymentCount: store.payments.length,
      paymentProofCount: store.payment_proofs.length,
      receiptCount: store.receipts.length,
      aiConversationCount: store.ai_conversations.length,
      aiMessageCount: store.ai_messages.length,
    };
  }

  const conn = ensureDb();
  const q = (table) =>
    conn.prepare(`SELECT COUNT(*) as n FROM ${table}`).get().n;
  return {
    activityCount: q("activities"),
    intentCount: q("intents"),
    contactCount: q("contacts"),
    communityUserCount: q("community_users"),
    onboardingAnswerCount: q("onboarding_answers"),
    userQuestionCount: q("user_questions"),
    serviceRequestCount: q("service_requests"),
    paymentLinkCount: q("payment_links"),
    paymentCount: q("payments"),
    paymentProofCount: q("payment_proofs"),
    receiptCount: q("receipts"),
    aiConversationCount: q("ai_conversations"),
    aiMessageCount: q("ai_messages"),
  };
}

module.exports = {
  ensureDb,
  insertActivity,
  listActivitiesForUser,
  getParticipationSummary,
  insertIntent,
  insertContact,
  insertReceipt,
  insertServiceRequest,
  listServiceRequestsForUser,
  insertPaymentLink,
  attachPaymentLinkReceipt,
  listPaymentLinksForUser,
  insertPayment,
  insertPaymentProof,
  findPaymentProofByIdempotency,
  findReceiptForEntity,
  listPendingPayments,
  resolvePayment,
  listReceiptsForUser,
  getReceiptById,
  getPaymentLinkBySlug,
  generateReceiptNumber,
  insertAiConversation,
  insertAiMessage,
  listAiConversationsForUser,
  getAiConversationForUser,
  listAiMessagesForConversation,
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
