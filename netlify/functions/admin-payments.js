"use strict";

const {
  json,
  handleOptions,
  requireAdmin,
  methodOf,
  withErrorBoundary,
} = require("../../src/http");
const { listPendingPayments } = require("../../src/db");

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;
  if (methodOf(event) !== "GET")
    return {
      statusCode: 405,
      headers: {},
      body: JSON.stringify({ ok: false, error: "Method not allowed." }),
    };
  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;
  return json({ ok: true, items: listPendingPayments() }, 200, event);
});
