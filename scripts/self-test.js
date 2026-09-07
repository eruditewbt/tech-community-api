"use strict";

const fs = require("fs");
const path = require("path");

process.env.TECH_COMMUNITY_DB_PATH =
  process.env.TECH_COMMUNITY_DB_PATH ||
  path.resolve(__dirname, "../.tmp/self-test-tech-community.sqlite");
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
const serviceRequests = require("../netlify/functions/service-requests.js");
const paymentLinks = require("../netlify/functions/payment-links.js");
const aiConversations = require("../netlify/functions/ai-conversations.js");
const paymentProofs = require("../netlify/functions/payment-proofs.js");
const {
  listActivitiesForUser,
  getParticipationSummary,
} = require("../src/db.js");

async function main() {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        user: {
          uid: "self-test-user-1",
          email: "tester@example.com",
          displayName: "Tester",
        },
      },
    }),
  });

  const serviceRes = await serviceRequests.handler({
    httpMethod: "POST",
    headers: {
      origin: "https://eruditewbt.github.io",
      authorization: "Bearer self-test-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      type: "tutor",
      title: "Need help planning my sprint",
      description: "I need a working roadmap and project plan.",
      priority: "high",
    }),
  });
  const serviceBody = JSON.parse(serviceRes.body);
  if (
    serviceRes.statusCode !== 200 ||
    serviceBody.ok !== true ||
    !serviceBody.serviceRequest
  ) {
    throw new Error(
      `Service request creation failed: ${serviceRes.statusCode} ${serviceRes.body}`,
    );
  }

  const paymentRes = await paymentLinks.handler({
    httpMethod: "POST",
    headers: {
      origin: "https://eruditewbt.github.io",
      authorization: "Bearer self-test-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      serviceType: "tutor",
      title: "One hour tutoring session",
      description: "Single mentoring session for project planning.",
      amount: 25,
      currency: "USD",
      recipientLabel: "EruditeWBT",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }),
  });
  const paymentBody = JSON.parse(paymentRes.body);
  if (
    paymentRes.statusCode !== 200 ||
    paymentBody.ok !== true ||
    !paymentBody.paymentLink ||
    !paymentBody.receipt
  ) {
    throw new Error(
      `Payment link creation failed: ${paymentRes.statusCode} ${paymentRes.body}`,
    );
  }

  const proofRequest = {
    httpMethod: "POST",
    headers: {
      origin: "https://eruditewbt.github.io",
      authorization: "Bearer self-test-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      slug: paymentBody.paymentLink.public_slug,
      providerReference: "self-test-transfer",
      proofReference: "self-test-proof",
      proofNote: "Proof idempotency check.",
      idempotencyKey: "self-test-proof-key",
    }),
  };
  const proofRes = await paymentProofs.handler(proofRequest);
  const proofBody = JSON.parse(proofRes.body);
  const retryRes = await paymentProofs.handler(proofRequest);
  const retryBody = JSON.parse(retryRes.body);
  if (
    proofRes.statusCode !== 200 ||
    retryRes.statusCode !== 200 ||
    retryBody.idempotent !== true ||
    proofBody.receipt.receipt_number !== retryBody.receipt.receipt_number
  ) {
    throw new Error(
      `Payment proof idempotency failed: ${proofRes.body} / ${retryRes.body}`,
    );
  }

  const aiRes = await aiConversations.handler({
    httpMethod: "POST",
    headers: {
      origin: "https://eruditewbt.github.io",
      authorization: "Bearer self-test-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      title: "Self-test conversation",
      purpose: "Validate bounded AI persistence",
      content: "Help me choose the next small project step.",
      contextLinks: [
        {
          url: "https://example.com/project",
          title: "Project context",
          excerpt: "Public project context.",
        },
      ],
    }),
  });
  const aiBody = JSON.parse(aiRes.body);
  if (
    aiRes.statusCode !== 200 ||
    aiBody.ok !== true ||
    !aiBody.conversation ||
    !aiBody.userMessage
  ) {
    throw new Error(
      `AI conversation capture failed: ${aiRes.statusCode} ${aiRes.body}`,
    );
  }

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
    [
      "question",
      "I want to work on automation and maybe help with task manager.",
    ],
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
      throw new Error(
        `Onboarding step failed for ${stepKey}: ${res.statusCode} ${res.body}`,
      );
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
    throw new Error(
      `Admin dashboard failed: ${adminRes.statusCode} ${adminRes.body}`,
    );
  }
  if (!adminBody.communityUsers || !adminBody.communityUsers.length) {
    throw new Error("Expected at least one saved community user.");
  }
  const activityTypes = listActivitiesForUser("self-test-user-1", 100).map(
    (item) => item.event_type,
  );
  for (const expected of [
    "service_request.submitted",
    "payment_link.created",
    "payment.proof_submitted",
    "ai.conversation_started",
  ]) {
    if (!activityTypes.includes(expected))
      throw new Error(`Missing activity event: ${expected}`);
  }
  const participation = getParticipationSummary("self-test-user-1");
  if (
    !participation.score ||
    participation.totals.serviceRequests < 1 ||
    participation.totals.paymentLinks < 1
  ) {
    throw new Error(
      `Participation summary failed: ${JSON.stringify(participation)}`,
    );
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
  console.log(
    `Questions logged: ${adminBody.stats.dbCounts.userQuestionCount}`,
  );
  console.log(
    `CORS origin: ${optionsRes.headers["access-control-allow-origin"]}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
