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
  insertPaymentLink,
  attachPaymentLinkReceipt,
  insertReceipt,
  listPaymentLinksForUser,
  getPaymentLinkBySlug,
  getReceiptById,
} = require("../../src/db");
const { emitActivity } = require("../../src/activity-events");

function buildPaymentReceipt({
  ownerUid,
  paymentLink,
  type = "PAYMENT_LINK_CREATED",
}) {
  const summary = `Payment link created for ${paymentLink.title} (${paymentLink.currency} ${paymentLink.amount}).`;
  const receipt = insertReceipt({
    owner_uid: ownerUid,
    type,
    entity_type: "payment_link",
    entity_id: paymentLink.id,
    summary,
    status: "PENDING",
    amount: Number(paymentLink.amount || 0),
    currency: paymentLink.currency || "USD",
    verification_state: "LINK_CREATED_NOT_PAYMENT_PROOF",
    payload_json: {
      paymentLinkId: paymentLink.id,
      publicSlug: paymentLink.public_slug,
      shareUrl: paymentLink.share_url,
      creatorUid: ownerUid,
      serviceType: paymentLink.service_type,
      title: paymentLink.title,
      description: paymentLink.description,
    },
  });
  return receipt;
}

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  if (methodOf(event) === "GET") {
    const user = await authenticate(event);
    if (!user)
      return error(
        "Authentication required.",
        401,
        { code: "AUTH_REQUIRED" },
        event,
      );
    const items = listPaymentLinksForUser(user.uid);
    return json({ ok: true, items }, 200, event);
  }

  if (methodOf(event) !== "POST")
    return error("Method not allowed.", 405, {}, event);

  const user = await authenticate(event);
  if (!user)
    return error(
      "Authentication required.",
      401,
      { code: "AUTH_REQUIRED" },
      event,
    );

  const body = parseBody(event);
  const serviceType = cleanText(
    body.serviceType || body.service_type || "general",
    80,
  );
  const title = cleanText(body.title || "Payment link", 220);
  const description = cleanText(body.description || "", 6000);
  const amount = Number(body.amount || 0);
  const currency = cleanText(body.currency || "USD", 12);
  const recipientLabel = cleanText(
    body.recipientLabel || body.recipient_label || "EruditeWBT",
    120,
  );
  const expiresAt = cleanText(body.expiresAt || body.expires_at || "", 1000);
  const idempotencyKey = cleanText(
    event.headers?.["idempotency-key"] ||
      event.headers?.["Idempotency-Key"] ||
      body.idempotencyKey ||
      "",
    240,
  );

  if (!title || !Number.isFinite(amount) || amount <= 0) {
    return error(
      "`title` and a positive `amount` are required.",
      400,
      {},
      event,
    );
  }

  const paymentLink = insertPaymentLink({
    creatorUid: user.uid,
    serviceType,
    title,
    description,
    amount,
    currency,
    recipientLabel,
    expiresAt,
    idempotencyKey,
  });

  if (idempotencyKey && paymentLink.creation_receipt_id) {
    const previousReceipt = getReceiptById(paymentLink.creation_receipt_id);
    if (previousReceipt) {
      return json(
        {
          ok: true,
          idempotent: true,
          paymentLink,
          receipt: previousReceipt,
          shareUrl: paymentLink.share_url,
          message: "Payment link already created.",
        },
        200,
        event,
      );
    }
  }

  const receipt = buildPaymentReceipt({
    ownerUid: user.uid,
    paymentLink,
    type: "PAYMENT_LINK_CREATED",
  });
  const updatedLink = attachPaymentLinkReceipt(paymentLink.id, receipt.id) || {
    ...paymentLink,
    creation_receipt_id: receipt.id,
  };
  await emitActivity({
    ownerUid: user.uid,
    eventType: "payment_link.created",
    entityType: "payment_link",
    entityId: paymentLink.id,
    summary: `Payment link created: ${title}.`,
    payload: {
      public_slug: paymentLink.public_slug,
      receipt_id: receipt.id,
      amount,
      currency,
    },
  });
  return json(
    {
      ok: true,
      paymentLink: updatedLink,
      receipt,
      shareUrl: paymentLink.share_url,
      message: "Payment link created. Creation receipt issued.",
    },
    200,
    event,
  );
});

exports.getPublicPaymentLink = async function getPublicPaymentLink(slug) {
  return getPaymentLinkBySlug(slug);
};
