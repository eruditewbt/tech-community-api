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
const { insertContact, listRecent } = require("../../src/db");
const { sendContactMail, isMailConfigured } = require("../../src/mail");

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  if (event.httpMethod === "GET") {
    const auth = requireAdmin(event);
    if (!auth.ok) return auth.response;
    return json({ ok: true, items: listRecent("contacts", 50) });
  }

  if (event.httpMethod !== "POST") return error("Method not allowed.", 405);

  const body = parseBody(event);
  const name = cleanText(body.name, 160);
  const email = cleanOptionalEmail(body.email || "");
  const message = cleanText(body.message, 6000);
  const subject = cleanText(body.subject, 240);
  if (!name || !email || !message) {
    return error("`name`, `email`, and `message` are required.");
  }
  if (email === null) return error("`email` is invalid.");

  const cleanBody = { ...body, name, email, message, subject };
  const saved = insertContact(cleanBody);
  const mail = await sendContactMail(cleanBody);

  return json({
    ok: true,
    saved,
    mail,
    mailConfigured: isMailConfigured(),
    message: "Message received.",
  });
});
