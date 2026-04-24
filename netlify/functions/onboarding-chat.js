"use strict";

const {
  json,
  error,
  parseBody,
  handleOptions,
  requireAdmin,
  methodOf,
  cleanText,
  cleanOptionalEmail,
  withErrorBoundary,
} = require("../../src/http");
const {
  upsertCommunityUser,
  findCommunityUser,
  saveOnboardingAnswer,
  listOnboardingAnswersForUser,
  insertUserQuestion,
} = require("../../src/db");
const {
  getFlow,
  getStep,
  nextStepForCompletedKeys,
  buildSuggestions,
  buildReply,
  buildWhatsAppHandoff,
  summarizeRepoArea,
  summarizeProjectFocus,
  needsHumanHandoff,
} = require("../../src/community-knowledge");

function shapeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    sessionId: user.session_id || "",
    email: user.email || "",
    name: user.name || "",
    domain: user.domain || "",
    goal: user.current_goal || "",
    skillLevel: user.skill_level || "",
    repoInterest: user.repo_interest || "",
    updatedAt: user.updated_at || user.created_at || "",
  };
}

exports.handler = withErrorBoundary(async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  if (methodOf(event) === "GET") {
    const auth = requireAdmin(event);
    if (!auth.ok) return auth.response;
    const body = parseBody(event);
    const sessionId = cleanText((event.queryStringParameters && event.queryStringParameters.sessionId) || body.sessionId || "", 240);
    const user = sessionId ? findCommunityUser({ sessionId }) : null;
    const answers = user ? listOnboardingAnswersForUser(user.id) : [];
    const completedKeys = answers.map((item) => item.question_key);
    return json({
      ok: true,
      flow: getFlow(),
      user: shapeUser(user),
      answers,
      nextStep: nextStepForCompletedKeys(completedKeys),
    }, 200, event);
  }

  if (methodOf(event) !== "POST") return error("Method not allowed.", 405, {}, event);

  const body = parseBody(event);
  const sessionId = cleanText(body.sessionId, 240);
  const stepKey = cleanText(body.stepKey, 120);
  const answer = cleanText(body.answer, 4000);
  const page = cleanText(body.page, 400);
  if (!sessionId || !stepKey || !answer) {
    return error("`sessionId`, `stepKey`, and `answer` are required.", 400, {}, event);
  }

  const step = getStep(stepKey);
  if (!step) return error("Unknown onboarding step.", 400, {}, event);

  if (stepKey === "email") {
    const email = cleanOptionalEmail(answer);
    if (email === null) return error("Please enter a valid email address.", 400, {}, event);
  }

  const profileInput = {
    sessionId,
    source: cleanText(body.source || "community-assistant", 120),
  };

  if (stepKey === "email") profileInput.email = answer;
  if (stepKey === "name") profileInput.name = answer;
  if (stepKey === "domain") profileInput.domain = answer;
  if (stepKey === "goal") profileInput.goal = answer;
  if (stepKey === "skill_level") profileInput.skill_level = answer;
  if (stepKey === "repo_interest") profileInput.repo_interest = answer;

  let user = upsertCommunityUser(profileInput);

  saveOnboardingAnswer({
    userId: user.id,
    sessionId,
    questionKey: step.key,
    questionLabel: step.label,
    answerText: answer,
    page,
  });

  if (stepKey === "question") {
    const profileQuestion = cleanText(answer, 4000);
    const profileWithQuestion = {
      domain: user.domain,
      current_goal: user.current_goal,
      repo_interest: user.repo_interest,
      skill_level: user.skill_level,
      email: user.email,
    };
    const suggestions = buildSuggestions(profileWithQuestion, profileQuestion);
    const reply = buildReply({ profile: profileWithQuestion, stepKey, answer: profileQuestion, suggestions });
    const repoSummary = summarizeRepoArea(profileWithQuestion, profileQuestion);
    const projectFocus = summarizeProjectFocus(profileWithQuestion, profileQuestion);
    const handoff = buildWhatsAppHandoff(
      {
        ...profileWithQuestion,
        name: user.name,
      },
      profileQuestion,
      suggestions
    );
    insertUserQuestion({
      userId: user.id,
      sessionId,
      questionText: profileQuestion,
      answerSummary: reply,
      page,
    });
    const answers = listOnboardingAnswersForUser(user.id);
    const completedKeys = answers.map((item) => item.question_key);
    return json({
      ok: true,
      user: shapeUser(user),
      flow: getFlow(),
      answers,
      nextStep: nextStepForCompletedKeys(completedKeys),
      reply,
      suggestions,
      repoSummary,
      projectFocus,
      handoff,
      humanHandoffRecommended: needsHumanHandoff(profileWithQuestion, profileQuestion),
      progress: {
        completed: completedKeys.length,
        total: getFlow().length,
      },
      mode: completedKeys.length >= getFlow().length ? "assistant" : "onboarding",
      message: "Question recorded.",
    }, 200, event);
  }

  user = findCommunityUser({ sessionId, email: user.email });
  const answers = listOnboardingAnswersForUser(user.id);
  const completedKeys = answers.map((item) => item.question_key);
  const nextStep = nextStepForCompletedKeys(completedKeys);
  const profileForSuggestions = {
    domain: user.domain,
    current_goal: user.current_goal,
    repo_interest: user.repo_interest,
    skill_level: user.skill_level,
    email: user.email,
  };
  const suggestions = buildSuggestions(profileForSuggestions, nextStep && nextStep.key === "question" ? "" : answer);
  const reply = buildReply({ profile: profileForSuggestions, stepKey, answer, suggestions });
  const repoSummary = summarizeRepoArea(profileForSuggestions, answer);
  const projectFocus = summarizeProjectFocus(profileForSuggestions, answer);
  const handoff = buildWhatsAppHandoff(
    {
      ...profileForSuggestions,
      name: user.name,
    },
    stepKey === "question" ? answer : "",
    suggestions
  );

  return json({
    ok: true,
    user: shapeUser(user),
    flow: getFlow(),
    answers,
    nextStep,
    reply,
    suggestions,
    repoSummary,
    projectFocus,
    handoff,
    progress: {
      completed: completedKeys.length,
      total: getFlow().length,
    },
    mode: nextStep ? "onboarding" : "assistant",
    message: "Answer recorded.",
  }, 200, event);
});
