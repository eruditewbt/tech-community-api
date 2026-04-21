"use strict";

const fs = require("fs");
const { SEED_DATA_PATH } = require("./config");
const { getCounts, listRecent } = require("./db");

function readSeedData() {
  try {
    return JSON.parse(fs.readFileSync(SEED_DATA_PATH, "utf8"));
  } catch (_) {
    return {
      activeProjects: 0,
      openRoles: 0,
      currentSprint: "Not set",
      ideasInVoting: 0,
      proofFeed: [],
      nextActivities: [],
      blogPosts: [],
      deployedProducts: [],
    };
  }
}

function buildLiveData() {
  const seed = readSeedData();
  const counts = getCounts();
  const recentActivities = listRecent("activities", 8).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    page: row.page,
    label: row.label,
    href: row.href,
    sessionId: row.session_id,
    referrer: row.referrer,
    createdAt: row.created_at,
    payload: safeJson(row.payload_json),
  }));

  return {
    ok: true,
    activeProjects: seed.activeProjects ?? 0,
    openRoles: seed.openRoles ?? 0,
    currentSprint: seed.currentSprint ?? "Not set",
    ideasInVoting: seed.ideasInVoting ?? 0,
    proofFeed: Array.isArray(seed.proofFeed) ? seed.proofFeed : [],
    nextActivities: Array.isArray(seed.nextActivities) ? seed.nextActivities : [],
    blogPosts: Array.isArray(seed.blogPosts) ? seed.blogPosts : [],
    deployedProducts: Array.isArray(seed.deployedProducts) ? seed.deployedProducts : [],
    counts,
    recentActivities,
    updatedAt: new Date().toISOString(),
  };
}

function safeJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

module.exports = {
  buildLiveData,
};
