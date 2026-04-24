"use strict";

const { json, error, parseBody, handleOptions, requireAdmin, methodOf, cleanText, withErrorBoundary } = require("../../src/http");
const { insertActivity, listRecent } = require("../../src/db");

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  if (methodOf(event) === "GET") {
    const auth = requireAdmin(event);
    if (!auth.ok) return auth.response;
    return json({ ok: true, items: listRecent("activities", 50) }, 200, event);
  }

  if (methodOf(event) !== "POST") return error("Method not allowed.", 405, {}, event);

  const body = parseBody(event);
  if (!body.eventType) return error("`eventType` is required.", 400, {}, event);
  const saved = insertActivity({
    event_type: cleanText(body.eventType, 120),
    page: body.page,
    label: body.label,
    href: body.href,
    session_id: body.sessionId,
    referrer: body.referrer,
    payload: body.payload,
  });
  return json({ ok: true, saved }, 200, event);
});
