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
  insertServiceRequest,
  listServiceRequestsForUser,
} = require("../../src/db");
const { emitActivity } = require("../../src/activity-events");

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
    const items = listServiceRequestsForUser(user.uid);
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
  const type = cleanText(body.type || body.serviceType || "general", 80);
  const title = cleanText(body.title || "Service request", 220);
  const description = cleanText(body.description || "", 6000);
  const priority = cleanText(body.priority || "normal", 40);
  const conversationId = cleanText(
    body.conversationId || body.conversation_id || "",
    180,
  );
  const idempotencyKey = cleanText(
    event.headers?.["idempotency-key"] ||
      event.headers?.["Idempotency-Key"] ||
      body.idempotencyKey ||
      "",
    240,
  );

  if (!title || !description) {
    return error("`title` and `description` are required.", 400, {}, event);
  }

  const serviceRequest = insertServiceRequest({
    ownerUid: user.uid,
    type,
    title,
    description,
    priority,
    conversationId,
    status: "SUBMITTED",
    idempotencyKey,
  });
  await emitActivity({
    ownerUid: user.uid,
    eventType: "service_request.submitted",
    entityType: "service_request",
    entityId: serviceRequest.id,
    summary: `Service request submitted: ${title}.`,
    payload: { type, priority, status: serviceRequest.status },
  });

  return json(
    {
      ok: true,
      serviceRequest,
      message: "Service request created.",
    },
    200,
    event,
  );
});
