"use strict";

const {
  INTELLIGENTSIA_ENABLED,
  INTELLIGENTSIA_RUNTIME_URL,
  INTELLIGENTSIA_CLIENT_ID,
  CONNECTWBT_PROJECT_ID,
  CONNECTWBT_TIMEOUT_MS,
} = require("./config");

function answerText(payload) {
  const answer = payload && payload.answer;
  if (typeof answer === "string") return answer;
  if (answer && typeof answer === "object")
    return String(answer.text || answer.content || "");
  return String(payload && (payload.text || payload.message || ""));
}

async function ask({
  token,
  goal,
  context = {},
  mode = "chat",
  explain = false,
  clarify = false,
}) {
  if (!INTELLIGENTSIA_ENABLED || !token) return { enabled: false, text: "" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECTWBT_TIMEOUT_MS);
  try {
    const response = await fetch(INTELLIGENTSIA_RUNTIME_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Client-ID": INTELLIGENTSIA_CLIENT_ID,
        "X-ConnectCrypt-Project": CONNECTWBT_PROJECT_ID,
      },
      body: JSON.stringify({ goal, mode, context, explain, clarify }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      return {
        enabled: true,
        text: "",
        error: `Intelligentsia request failed (${response.status}).`,
      };
    }
    return {
      enabled: true,
      text: answerText(payload),
      providerRequestId: String(
        payload.requestId || payload.request_id || payload.id || "",
      ),
    };
  } catch (error) {
    return {
      enabled: true,
      text: "",
      error:
        error.name === "AbortError"
          ? "Intelligentsia request timed out."
          : "Intelligentsia is unavailable.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { ask };
