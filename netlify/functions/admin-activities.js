"use strict";

const { json, handleOptions, requireAdmin, withErrorBoundary } = require("../../src/http");
const { listRecent, getCounts, listCommunityUsersDetailed } = require("../../src/db");
const { buildLiveData } = require("../../src/live-data");

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  return json({
    ok: true,
    counts: getCounts(),
    live: buildLiveData(),
    activities: listRecent("activities", 50),
    intents: listRecent("intents", 25),
    contacts: listRecent("contacts", 25),
    communityUsers: listCommunityUsersDetailed(50),
  }, 200, event);
});
