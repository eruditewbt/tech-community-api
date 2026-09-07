"use strict";

const {
  json,
  error,
  handleOptions,
  methodOf,
  withErrorBoundary,
} = require("../../src/http");
const { authenticate } = require("../../src/connectwbt-auth");
const { upsertCommunityUser } = require("../../src/db");

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;
  if (methodOf(event) !== "GET")
    return error("Method not allowed.", 405, {}, event);
  const user = await authenticate(event);
  if (!user)
    return error(
      "Authentication required.",
      401,
      { code: "AUTH_REQUIRED" },
      event,
    );
  const communityUser = upsertCommunityUser({
    ownerUid: user.uid,
    email: user.email || "",
    name: user.displayName || user.name || "",
    source: "connectwbt-auth",
  });
  return json({ ok: true, user, communityUser }, 200, event);
});
