"use strict";

const {
  json,
  error,
  parseBody,
  handleOptions,
  requireAdmin,
  methodOf,
  cleanText,
  cleanOptionalEmail,
  withErrorBoundary,
} = require("../../src/http");
const { insertIntent, listRecent } = require("../../src/db");

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  if (methodOf(event) === "GET") {
    const auth = requireAdmin(event);
    if (!auth.ok) return auth.response;
    return json({ ok: true, items: listRecent("intents", 50) }, 200, event);
  }

  if (methodOf(event) !== "POST") return error("Method not allowed.", 405, {}, event);

  const body = parseBody(event);
  const name = cleanText(body.name, 160);
  const intent = cleanText(body.intent, 500);
  const email = cleanOptionalEmail(body.email || "");
  if (!name || !intent) return error("`name` and `intent` are required.", 400, {}, event);
  if (body.email && email === null) return error("`email` is invalid.", 400, {}, event);
  const saved = insertIntent({ ...body, name, intent, email });
  return json({ ok: true, saved, message: "Intent received." }, 200, event);
});
