"use strict";

const {
  json,
  error,
  parseBody,
  handleOptions,
  requireAdmin,
  methodOf,
  cleanText,
  withErrorBoundary,
} = require("../../src/http");
const { resolvePayment, insertReceipt } = require("../../src/db");
const { emitActivity } = require("../../src/activity-events");

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;
  if (methodOf(event) !== "POST")
    return error("Method not allowed.", 405, {}, event);
  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;
  const body = parseBody(event);
  const paymentId = Number(body.paymentId || body.payment_id || 0);
  const status = cleanText(body.status || "MANUALLY_RESOLVED", 60);
  const note = cleanText(
    body.resolutionNote || body.resolution_note || "",
    4000,
  );
  if (!paymentId || !note)
    return error(
      "`paymentId` and `resolutionNote` are required.",
      400,
      {},
      event,
    );
  const adminToken = String((event.headers || {}).authorization || "").replace(
    /^Bearer\s+/i,
    "",
  );
  const payment = resolvePayment({
    paymentId,
    status,
    resolvedByUid: adminToken ? "admin-token" : "admin",
    resolutionNote: note,
  });
  if (!payment)
    return error(
      "Payment not found.",
      404,
      { code: "PAYMENT_NOT_FOUND" },
      event,
    );
  const receipt = insertReceipt({
    ownerUid: payment.payer_uid,
    type: `PAYMENT_${status}`,
    entityType: "payment",
    entityId: payment.id,
    summary: `Payment resolution recorded as ${status}.`,
    status:
      status === "PROVIDER_CONFIRMED" || status === "MANUALLY_RESOLVED"
        ? "ISSUED"
        : "PENDING",
    amount: payment.amount,
    currency: payment.currency,
    verificationState: status,
    payloadJson: { paymentId: payment.id, resolutionNote: note },
  });
  await emitActivity({
    ownerUid: payment.payer_uid,
    eventType: "payment.resolved",
    entityType: "payment",
    entityId: payment.id,
    summary: `Payment resolution recorded as ${status}.`,
    payload: { resolver_role: "admin", receipt_id: receipt.id, status },
  });
  return json({ ok: true, payment, receipt }, 200, event);
});
