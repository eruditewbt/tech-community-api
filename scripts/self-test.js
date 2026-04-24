"use strict";

const fs = require("fs");
const path = require("path");

process.env.TECH_COMMUNITY_DB_PATH =
  process.env.TECH_COMMUNITY_DB_PATH || path.resolve(__dirname, "../.tmp/self-test-tech-community.sqlite");
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || "self-test-admin-token";

try {
  fs.rmSync(process.env.TECH_COMMUNITY_DB_PATH, { force: true });
} catch (_) {}
try {
  fs.rmSync(`${process.env.TECH_COMMUNITY_DB_PATH}.json`, { force: true });
} catch (_) {}

const onboarding = require("../netlify/functions/onboarding-chat.js");
const admin = require("../netlify/functions/admin-dashboard.js");
const liveData = require("../netlify/functions/live-data.js");

async function main() {
  const optionsRes = await onboarding.handler({
    httpMethod: "OPTIONS",
    headers: { origin: "https://eruditewbt.github.io" },
  });
  if (optionsRes.statusCode !== 204) {
    throw new Error(`Expected OPTIONS 204, got ${optionsRes.statusCode}`);
  }

  const flow = [
    ["domain", "education"],
    ["email", "tester@example.com"],
    ["name", "Tester"],
    ["goal", "Join a project"],
    ["skill_level", "Early beginner"],
    ["repo_interest", "HACKCLUB"],
    ["question", "I want to work on automation and maybe help with task manager."],
  ];

  for (const [stepKey, answer] of flow) {
    const res = await onboarding.handler({
      httpMethod: "POST",
      headers: {
        origin: "https://eruditewbt.github.io",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sessionId: "self_test_session",
        stepKey,
        answer,
        page: "/docs/index.html",
        source: "self-test",
      }),
    });
    const body = JSON.parse(res.body);
    if (res.statusCode !== 200 || body.ok !== true) {
      throw new Error(`Onboarding step failed for ${stepKey}: ${res.statusCode} ${res.body}`);
    }
  }

  const adminRes = await admin.handler({
    httpMethod: "GET",
    headers: {
      origin: "https://eruditewbt.github.io",
      "x-admin-token": process.env.ADMIN_TOKEN,
    },
  });
  const adminBody = JSON.parse(adminRes.body);
  if (adminRes.statusCode !== 200 || adminBody.ok !== true) {
    throw new Error(`Admin dashboard failed: ${adminRes.statusCode} ${adminRes.body}`);
  }
  if (!adminBody.communityUsers || !adminBody.communityUsers.length) {
    throw new Error("Expected at least one saved community user.");
  }

  const liveRes = await liveData.handler({
    httpMethod: "GET",
    headers: { origin: "https://eruditewbt.github.io" },
  });
  const liveBody = JSON.parse(liveRes.body);
  if (liveRes.statusCode !== 200 || liveBody.ok !== true) {
    throw new Error(`Live data failed: ${liveRes.statusCode} ${liveRes.body}`);
  }

  console.log("Self-test passed.");
  console.log(`Saved user: ${adminBody.communityUsers[0].email}`);
  console.log(`Questions logged: ${adminBody.stats.dbCounts.userQuestionCount}`);
  console.log(`CORS origin: ${optionsRes.headers["access-control-allow-origin"]}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
