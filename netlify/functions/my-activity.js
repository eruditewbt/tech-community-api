"use strict";

const {
  json,
  error,
  handleOptions,
  methodOf,
  withErrorBoundary,
} = require("../../src/http");
const { authenticate } = require("../../src/connectwbt-auth");
const { listActivitiesForUser } = require("../../src/db");

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

  return json(
    { ok: true, items: listActivitiesForUser(user.uid, 100) },
    200,
    event,
  );
});
