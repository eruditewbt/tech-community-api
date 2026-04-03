"use strict";

const { json, handleOptions, requireAdmin, withErrorBoundary } = require("../../src/http");
const { listRecent, getCounts } = require("../../src/db");
const { buildLiveData } = require("../../src/live-data");

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  const live = buildLiveData();
  return json({
    ok: true,
    stats: {
      activeProjects: live.activeProjects,
      openRoles: live.openRoles,
      currentSprint: live.currentSprint,
      ideasInVoting: live.ideasInVoting,
      proofCount: Array.isArray(live.proofFeed) ? live.proofFeed.length : 0,
      lastSync: live.updatedAt,
      dbCounts: getCounts(),
    },
    proofFeed: live.proofFeed || [],
    activities: listRecent("activities", 20),
    intents: listRecent("intents", 20),
    contacts: listRecent("contacts", 20),
  });
});
