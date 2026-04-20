"use strict";

const FLOW = [
  {
    key: "domain",
    label: "What field or domain are you coming from?",
    prompt: "Tell us the field you are coming from so we can route you well.",
    input: "text",
    placeholder: "software, design, health, education, business, law...",
  },
  {
    key: "email",
    label: "What email should we use to follow up with you?",
    prompt: "Share the best email for repo access, project matching, and follow-up.",
    input: "email",
    placeholder: "you@example.com",
  },
  {
    key: "name",
    label: "What should we call you?",
    prompt: "A first name or working name is enough.",
    input: "text",
    placeholder: "Your name",
  },
  {
    key: "goal",
    label: "What do you want right now?",
    prompt: "Choose the clearest current goal so we can guide you faster.",
    input: "choice",
    choices: ["Learn foundations", "Join a project", "Build an idea", "Collaborate across fields", "Get repo access"],
  },
  {
    key: "skill_level",
    label: "How would you describe your current level?",
    prompt: "This helps us avoid routing you too high or too low.",
    input: "choice",
    choices: ["Absolute beginner", "Early beginner", "Intermediate", "Advanced"],
  },
  {
    key: "repo_interest",
    label: "Which repo or path feels closest to what you need?",
    prompt: "Pick the path that feels most relevant. We can still suggest something else if needed.",
    input: "choice",
    choices: [
      "Intro to Computing and Programming",
      "Tech Community by EruditeWBT",
      "HACKCLUB",
      "JAVASCRIPT",
      "TYPESCRIPT",
      "DARTANDFLUTTER",
      "VISUALSANDHCI",
      "Not sure yet",
    ],
  },
  {
    key: "question",
    label: "What are you trying to achieve, or what do you need help with first?",
    prompt: "Ask your real question here. We will answer, suggest a path, and record it for admin follow-up.",
    input: "textarea",
    placeholder: "I want to start coding... I need help choosing a repo... I want to join a project...",
  },
];

const COMMUNITY_LINKS = {
  discord: "https://discord.gg/8e4bQNknA",
  youtube: "https://www.youtube.com/@eruditewbt",
  telegram: "https://t.me/coding_session_by_eruditewbt",
  intro: "https://github.com/eruditewbt/Intro_to_Computing_and_Programming",
  introSite: "https://eruditewbt.github.io/Intro_to_Computing_and_Programming/",
  techCommunity: "https://github.com/eruditewbt/Tech_Community_by_EruditeWBT",
  javascript: "https://github.com/eruditewbt/JAVASCRIPT",
  typescript: "https://github.com/eruditewbt/TYPESCRIPT",
  hackclub: "https://github.com/eruditewbt/HACKCLUB",
  dart: "https://github.com/eruditewbt/DARTANDFLUTTER",
  visuals: "https://github.com/eruditewbt/VISUALSANDHCI",
  email: "mailto:${encodeURIComponent(process.env.MAIL_FROM_EMAIL || '' )}",
};

function getFlow() {
  return FLOW.map((step) => ({ ...step }));
}

function getStep(key) {
  return FLOW.find((step) => step.key === key) || null;
}

function nextStepForCompletedKeys(keys) {
  const done = new Set(keys || []);
  return FLOW.find((step) => !done.has(step.key)) || null;
}

function normalize(text) {
  return String(text || "").trim().toLowerCase();
}

function hasAny(text, terms) {
  const value = normalize(text);
  return terms.some((term) => value.includes(term));
}

function buildSuggestions(profile = {}, questionText = "") {
  const haystack = [
    profile.domain,
    profile.current_goal,
    profile.goal,
    profile.repo_interest,
    profile.skill_level,
    questionText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const suggestions = [];
  const push = (title, description, href, kind = "path") => {
    if (!suggestions.some((item) => item.title === title)) {
      suggestions.push({ title, description, href, kind });
    }
  };

  push(
    "Join Discord",
    "Best place for fast discussion, project matching, and posting your intent.",
    COMMUNITY_LINKS.discord,
    "community"
  );

  if (
    hasAny(haystack, ["beginner", "foundation", "start coding", "terminal", "git", "computer", "html", "css", "markdown"]) ||
    !profile.repo_interest ||
    profile.repo_interest === "Not sure yet"
  ) {
    push(
      "Intro to Computing and Programming",
      "Best first stop for device setup, terminals, editors, Git, HTML, Markdown, CSS, and first coding flow.",
      COMMUNITY_LINKS.intro,
      "repo"
    );
    push(
      "Intro course site",
      "Use the HTML course site if you want a cleaner guided start instead of raw repo files.",
      COMMUNITY_LINKS.introSite,
      "site"
    );
  }

  if (hasAny(haystack, ["python", "automation", "data", "ai", "machine learning", "analysis", "script"])) {
    push(
      "HACKCLUB",
      "Best path for Python fundamentals, automation, data, and AI-facing experiments.",
      COMMUNITY_LINKS.hackclub,
      "repo"
    );
  }

  if (hasAny(haystack, ["web", "frontend", "backend", "site", "node", "javascript"])) {
    push(
      "JAVASCRIPT",
      "Best path for web systems, app logic, browser behavior, and practical JS build flow.",
      COMMUNITY_LINKS.javascript,
      "repo"
    );
  }

  if (hasAny(haystack, ["typescript", "typed", "safer code", "large codebase", "full stack"])) {
    push(
      "TYPESCRIPT",
      "Best path for typed frontend/backend systems and stronger team-ready structure.",
      COMMUNITY_LINKS.typescript,
      "repo"
    );
  }

  if (hasAny(haystack, ["flutter", "dart", "mobile", "android app", "ios app", "cross-platform"])) {
    push(
      "DARTANDFLUTTER",
      "Best path for cross-platform application work and mobile-oriented builds.",
      COMMUNITY_LINKS.dart,
      "repo"
    );
  }

  if (hasAny(haystack, ["design", "ui", "ux", "hci", "graphics", "visual", "gui", "accessibility", "product design"])) {
    push(
      "VISUALSANDHCI",
      "Best path for graphics, UI, UX, GUI, accessibility, and human-centered product work.",
      COMMUNITY_LINKS.visuals,
      "repo"
    );
  }

  if (hasAny(haystack, ["project", "team", "collaborate", "idea", "product", "startup", "community", "repo access"])) {
    push(
      "Tech Community by EruditeWBT",
      "The wider collaboration hub for projects, ideas, progress, roles, and community operations.",
      COMMUNITY_LINKS.techCommunity,
      "repo"
    );
  }

  push(
    "Subscribe on YouTube",
    "Follow the teaching and community video layer so you can learn from live walkthroughs and public builds.",
    COMMUNITY_LINKS.youtube,
    "community"
  );

  if (profile.email) {
    push(
      "Repo access follow-up",
      "Your email can be used for repo-access follow-up and deeper collaboration routing when needed.",
      COMMUNITY_LINKS.email,
      "contact"
    );
  }

  return suggestions.slice(0, 6);
}

function buildReply({ profile = {}, stepKey = "", answer = "", suggestions = [] }) {
  const domain = profile.domain || "your field";
  const goal = profile.current_goal || profile.goal || "your current goal";

  if (stepKey === "domain") {
    return `Great — coming from ${answer || domain} gives us context. This community is designed to support both technical and non-technical domains, so we can route you without forcing you into the wrong path.`;
  }
  if (stepKey === "email") {
    return "Thanks. We use your email for follow-up, repo-access routing, and making sure you do not get stuck after posting intent.";
  }
  if (stepKey === "goal") {
    return `Good. If your current focus is ${answer || goal}, we can keep the next steps narrow and practical instead of overwhelming.`;
  }
  if (stepKey === "repo_interest") {
    return `That path makes sense. I’ll keep suggesting routes around ${answer || profile.repo_interest || "that repo"} while still surfacing stronger alternatives if your question points elsewhere.`;
  }
  if (stepKey === "question") {
    if (suggestions.length > 0) {
      const top = suggestions[0];
      return `Here is the best first move I’d recommend: start with ${top.title}. It matches what you asked about, and it gives you a concrete place to act now instead of staying stuck in research mode.`;
    }
    return `Thanks for the question. Based on ${domain} and your current goal around ${goal}, the next move is to join the community discussion, choose one repo path, and take one visible action this week.`;
  }
  return "Good — that gives us enough to guide you more concretely.";
}

module.exports = {
  COMMUNITY_LINKS,
  getFlow,
  getStep,
  nextStepForCompletedKeys,
  buildSuggestions,
  buildReply,
};
