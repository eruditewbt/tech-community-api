"use strict";

const {
  json,
  error,
  handleOptions,
  methodOf,
  withErrorBoundary,
} = require("../../src/http");
const { authenticate } = require("../../src/connectwbt-auth");
const {
  upsertCommunityUser,
  listActivitiesForUser,
  listServiceRequestsForUser,
  listPaymentLinksForUser,
  listReceiptsForUser,
  listAiConversationsForUser,
  getParticipationSummary,
} = require("../../src/db");

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

  return json(
    {
      ok: true,
      user,
      communityUser,
      activity: listActivitiesForUser(user.uid, 100),
      serviceRequests: listServiceRequestsForUser(user.uid),
      paymentLinks: listPaymentLinksForUser(user.uid),
      receipts: listReceiptsForUser(user.uid),
      conversations: listAiConversationsForUser(user.uid),
      participation: getParticipationSummary(user.uid),
    },
    200,
    event,
  );
});
