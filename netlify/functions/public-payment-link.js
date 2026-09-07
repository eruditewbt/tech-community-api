"use strict";

const {
  json,
  error,
  handleOptions,
  methodOf,
  cleanText,
  withErrorBoundary,
} = require("../../src/http");
const { getPaymentLinkBySlug } = require("../../src/db");

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;
  if (methodOf(event) !== "GET")
    return error("Method not allowed.", 405, {}, event);

  const slug = cleanText(event.queryStringParameters?.slug || "", 80);
  if (!slug) return error("`slug` is required.", 400, {}, event);

  const paymentLink = getPaymentLinkBySlug(slug);
  if (!paymentLink)
    return error(
      "Payment link not found.",
      404,
      { code: "PAYMENT_LINK_NOT_FOUND" },
      event,
    );

  return json(
    {
      ok: true,
      paymentLink: {
        public_slug: paymentLink.public_slug,
        service_type: paymentLink.service_type,
        title: paymentLink.title,
        description: paymentLink.description,
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        recipient_label: paymentLink.recipient_label,
        expires_at: paymentLink.expires_at,
        status: paymentLink.status,
        share_url: paymentLink.share_url,
        created_at: paymentLink.created_at,
        creation_receipt_status: "LINK_CREATED_NOT_PAYMENT_PROOF",
      },
    },
    200,
    event,
  );
});
