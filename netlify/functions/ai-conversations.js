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
const { authenticate, bearerToken } = require("../../src/connectwbt-auth");
const { ask: askIntelligentsia } = require("../../src/intelligentsia-client");
const {
  insertAiConversation,
  insertAiMessage,
  listAiConversationsForUser,
  getAiConversationForUser,
  listAiMessagesForConversation,
} = require("../../src/db");
const { emitActivity } = require("../../src/activity-events");

function sanitizeLinks(rawLinks) {
  if (!Array.isArray(rawLinks)) return [];
  return rawLinks
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      try {
        const parsed = new URL(cleanText(item.url || "", 500));
        if (!["http:", "https:"].includes(parsed.protocol)) return null;
        parsed.username = "";
        parsed.password = "";
        for (const key of Array.from(parsed.searchParams.keys())) {
          if (
            /(token|secret|password|passwd|api[_-]?key|auth|signature|code)/i.test(
              key,
            )
          )
            parsed.searchParams.delete(key);
        }
        return {
          url: parsed.toString(),
          title: cleanText(item.title || "", 200),
          excerpt: cleanText(item.excerpt || "", 500),
        };
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean);
}

function boundedContext({ purpose, contextLinks, recentMessages }) {
  return {
    purpose: cleanText(purpose || "EruditeWBT conversation", 800),
    links: sanitizeLinks(contextLinks).slice(0, 5),
    recent_messages: (recentMessages || []).slice(-8).map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: cleanText(item.content || "", 2000),
    })),
  };
}

async function answerConversation({
  event,
  user,
  conversation,
  content,
  contextLinks,
}) {
  const previousMessages = listAiMessagesForConversation(conversation.id).slice(
    -7,
  );
  const userMessage = insertAiMessage({
    conversationId: conversation.id,
    role: "user",
    content,
    contextLinks,
  });
  await emitActivity({
    ownerUid: user.uid,
    eventType: "ai.message_sent",
    entityType: "ai_conversation",
    entityId: conversation.id,
    summary: `Message sent in ${conversation.title}.`,
    payload: { link_count: contextLinks.length },
  });
  const provider = await askIntelligentsia({
    token: bearerToken(event),
    goal: content,
    context: boundedContext({
      purpose: conversation.purpose,
      contextLinks,
      recentMessages: [...previousMessages, userMessage],
    }),
    mode: "chat",
    explain: true,
    clarify: true,
  });
  let assistant = null;
  if (provider.text) {
    assistant = insertAiMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: provider.text,
      contextLinks,
      providerRequestId: provider.providerRequestId,
    });
  }
  return {
    userMessage,
    assistant,
    provider: {
      enabled: provider.enabled,
      available: Boolean(provider.text),
      error: provider.error || "",
    },
  };
}

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  const user = await authenticate(event);
  if (!user)
    return error(
      "Authentication required.",
      401,
      { code: "AUTH_REQUIRED" },
      event,
    );

  if (methodOf(event) === "GET") {
    const items = listAiConversationsForUser(user.uid);
    return json({ ok: true, items }, 200, event);
  }

  if (methodOf(event) !== "POST")
    return error("Method not allowed.", 405, {}, event);

  const body = parseBody(event);
  const action = cleanText(body.action || "create", 40);

  if (action === "message") {
    const conversationId = Number(
      body.conversationId || body.conversation_id || 0,
    );
    const content = cleanText(body.content || "", 12000);
    const contextLinks = sanitizeLinks(
      body.contextLinks || body.context_links || [],
    );
    if (!conversationId || !content) {
      return error(
        "`conversationId` and `content` are required.",
        400,
        {},
        event,
      );
    }
    const conversation = getAiConversationForUser(conversationId, user.uid);
    if (!conversation) {
      return error(
        "Conversation not found.",
        404,
        { code: "CONVERSATION_NOT_FOUND" },
        event,
      );
    }
    const result = await answerConversation({
      event,
      user,
      conversation,
      content,
      contextLinks,
    });
    return json(
      {
        ok: true,
        ...result,
        message: result.assistant
          ? "AI response created."
          : "Message captured; AI response is currently unavailable.",
      },
      200,
      event,
    );
  }

  const title = cleanText(body.title || "AI conversation", 220);
  const purpose = cleanText(body.purpose || "", 800);
  const provider = cleanText(body.provider || "intelligentsia", 80);
  const consentFlags = cleanText(
    body.consentFlags || body.consent_flags || "",
    1200,
  );
  const contextLinks = sanitizeLinks(
    body.contextLinks || body.context_links || [],
  );

  const conversation = insertAiConversation({
    ownerUid: user.uid,
    title,
    purpose,
    provider,
    consentFlags,
    metadataJson: { contextLinks },
  });

  let result = null;
  if (body.content) {
    result = await answerConversation({
      event,
      user,
      conversation,
      content: cleanText(body.content || "", 12000),
      contextLinks,
    });
  }

  await emitActivity({
    ownerUid: user.uid,
    eventType: "ai.conversation_started",
    entityType: "ai_conversation",
    entityId: conversation.id,
    summary: `AI conversation started: ${title}.`,
    payload: { provider, link_count: contextLinks.length },
  });

  return json(
    {
      ok: true,
      conversation,
      ...(result || {}),
      message: result?.assistant
        ? "Conversation started and AI response created."
        : "Conversation started.",
    },
    200,
    event,
  );
});

exports.listMessages = function listMessages(conversationId) {
  return listAiMessagesForConversation(conversationId);
};
