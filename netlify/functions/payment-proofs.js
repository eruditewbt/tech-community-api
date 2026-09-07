"use strict";

const {
  json,
  error,
  parseBody,
  handleOptions,
  methodOf,
  cleanText,
  withErrorBoundary,
} = require("../../src/http");
const { authenticate } = require("../../src/connectwbt-auth");
const {
  getPaymentLinkBySlug,
  insertPayment,
  insertPaymentProof,
  insertReceipt,
  findPaymentProofByIdempotency,
  findReceiptForEntity,
} = require("../../src/db");
const { emitActivity } = require("../../src/activity-events");

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;
  if (methodOf(event) !== "POST")
    return error("Method not allowed.", 405, {}, event);

  const user = await authenticate(event);
  if (!user)
    return error(
      "Authentication required before submitting payment proof.",
      401,
      { code: "AUTH_REQUIRED" },
      event,
    );

  const body = parseBody(event);
  const slug = cleanText(body.slug || "", 80);
  const link = getPaymentLinkBySlug(slug);
  if (!link)
    return error(
      "Payment link not found.",
      404,
      { code: "PAYMENT_LINK_NOT_FOUND" },
      event,
    );
  const proofReference = cleanText(
    body.proofReference || body.proof_reference || "",
    500,
  );
  if (!proofReference)
    return error("`proofReference` is required.", 400, {}, event);

  const amount = Number(body.amount || link.amount || 0);
  const idempotencyKey = cleanText(
    body.idempotencyKey || body.idempotency_key || "",
    240,
  );
  const previousProof = findPaymentProofByIdempotency(idempotencyKey, user.uid);
  if (previousProof) {
    const previousReceipt = findReceiptForEntity(
      user.uid,
      "PAYMENT_PROOF_SUBMITTED",
      "payment",
      previousProof.payment_id,
    );
    return json(
      {
        ok: true,
        idempotent: true,
        proof: previousProof,
        receipt: previousReceipt,
        message: "Payment proof already submitted.",
      },
      200,
      event,
    );
  }
  const payment = insertPayment({
    paymentLinkId: link.id,
    payerUid: user.uid,
    creatorUid: link.creator_uid,
    provider: cleanText(body.provider || "manual", 80),
    providerReference: cleanText(
      body.providerReference || body.provider_reference || "",
      240,
    ),
    amount,
    currency: cleanText(body.currency || link.currency || "USD", 12),
    status: "PAYMENT_PENDING",
    idempotencyKey,
  });
  const proof = insertPaymentProof({
    paymentId: payment.id,
    payerUid: user.uid,
    proofReference,
    proofNote: cleanText(body.proofNote || body.proof_note || "", 4000),
    idempotencyKey,
  });

  const receipt = insertReceipt({
    ownerUid: user.uid,
    type: "PAYMENT_PROOF_SUBMITTED",
    entityType: "payment",
    entityId: payment.id,
    summary: `Payment proof submitted for ${link.title}.`,
    status: "PENDING",
    amount,
    currency: link.currency,
    verificationState: "PENDING_OPERATOR_REVIEW",
    payloadJson: {
      paymentId: payment.id,
      paymentLinkId: link.id,
      proofId: proof.id,
      publicSlug: link.public_slug,
    },
  });
  await emitActivity({
    ownerUid: user.uid,
    eventType: "payment.proof_submitted",
    entityType: "payment",
    entityId: payment.id,
    summary: `Payment proof submitted for ${link.title}.`,
    payload: { payment_link_id: link.id, proof_id: proof.id },
  });
  return json(
    {
      ok: true,
      payment,
      proof,
      receipt,
      message: "Payment proof submitted for operator review.",
    },
    200,
    event,
  );
});
