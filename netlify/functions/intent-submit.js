"use strict";

const {
  json,
  error,
  parseBody,
  handleOptions,
  requireAdmin,
  cleanText,
  cleanOptionalEmail,
  withErrorBoundary,
} = require("../../src/http");
const { insertIntent, listRecent } = require("../../src/db");

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  if (event.httpMethod === "GET") {
    const auth = requireAdmin(event);
    if (!auth.ok) return auth.response;
    return json({ ok: true, items: listRecent("intents", 50) });
  }

  if (event.httpMethod !== "POST") return error("Method not allowed.", 405);

  const body = parseBody(event);
  const name = cleanText(body.name, 160);
  const intent = cleanText(body.intent, 500);
  const email = cleanOptionalEmail(body.email || "");
  if (!name || !intent) return error("`name` and `intent` are required.");
  if (body.email && email === null) return error("`email` is invalid.");
  const saved = insertIntent({ ...body, name, intent, email });
  return json({ ok: true, saved, message: "Intent received." });
});
