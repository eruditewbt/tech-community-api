"use strict";
const {MAIL_FROM_EMAIL} = require("./config")
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
      "GO / LEARNGO",
      "Church Management",
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
  website: "https://eruditewbt.github.io/Tech_Community_by_EruditeWBT/",
  api: "https://eruditewbt.netlify.app/api",
  discord: "https://discord.gg/8e4bQNknA",
  youtube: "https://www.youtube.com/@eruditewbt",
  telegram: "https://t.me/coding_session_by_eruditewbt",
  whatsappGroup: "https://chat.whatsapp.com/KJFAGqSsiNCAln0ZDJT6OO?mode=gi_c",
  linkedin: "https://www.linkedin.com/in/chemiosis-daniel-34542826a",
  xGbengs: "https://x.com/gbenga_oje16648",
  email: `mailto:${MAIL_FROM_EMAIL}`,
  activities: "https://eruditewbt.github.io/Tech_Community_by_EruditeWBT/activities.html",
  blog: "https://eruditewbt.github.io/Tech_Community_by_EruditeWBT/blog.html",
  calls: "https://eruditewbt.github.io/Tech_Community_by_EruditeWBT/calls-and-polls.html",
  learn: "https://eruditewbt.github.io/Tech_Community_by_EruditeWBT/learn.html",
  progress: "https://eruditewbt.github.io/Tech_Community_by_EruditeWBT/progress.html",
  join: "https://eruditewbt.github.io/Tech_Community_by_EruditeWBT/join.html",
  intro: "https://github.com/eruditewbt/Intro_to_Computing_and_Programming",
  introSite: "https://eruditewbt.github.io/Intro_to_Computing_and_Programming/",
  techCommunity: "https://github.com/eruditewbt/Tech_Community_by_EruditeWBT",
  engineeringTree: "https://github.com/eruditewbt/engineering-tree-community_repo",
  hackclub: "https://github.com/eruditewbt/HACKCLUB",
  javascript: "https://github.com/eruditewbt/JAVASCRIPT",
  typescript: "https://github.com/eruditewbt/TYPESCRIPT",
  dart: "https://github.com/eruditewbt/DARTANDFLUTTER",
  visuals: "https://github.com/eruditewbt/VISUALSANDHCI",
  go: "https://github.com/eruditewbt/LEARNGO",
  pdfReader: "https://pdf-reader-77ef58.web.app/",
  examManager: "https://examination-manager.web.app",
  taskManager: "https://task-master-d0262.web.app",
  appsHub: "https://eruditewbt.netlify.app/",
};

const REPO_GUIDES = [
  {
    key: "intro",
    title: "Intro to Computing and Programming",
    href: COMMUNITY_LINKS.intro,
    siteHref: COMMUNITY_LINKS.introSite,
    match: ["beginner", "foundation", "terminal", "git", "html", "css", "markdown", "setup", "computer"],
    bestFor: "First-stop foundations across device setup, terminals, Git, HTML, CSS, Markdown, and coding basics.",
    learnFrom: [
      "docs/start.html for the guided beginning",
      "docs/setup.html for device and tool setup",
      "docs/terminal.html for PowerShell, bash, cmd, and shell basics",
      "docs/git.html for Git hands-on practice",
      "docs/languages.html for HTML, Markdown, CSS, JavaScript, Python, and SQL overview",
    ],
    areas: ["docs/", "templates/", "labs/", "projects/"],
    access: "Public foundation repo. Start here even if you later move into a deeper private build repo.",
  },
  {
    key: "tech-community",
    title: "Tech Community by EruditeWBT",
    href: COMMUNITY_LINKS.techCommunity,
    siteHref: COMMUNITY_LINKS.website,
    match: ["community", "project", "team", "collaborate", "idea", "role", "sprint", "proof"],
    bestFor: "The ecosystem hub for roles, ideas, project flow, sprint proof, and cross-field collaboration.",
    learnFrom: [
      "docs/index.html for the platform overview",
      "docs/learn.html to choose a learning path",
      "docs/projects.html to see project types and build flow",
      "docs/collaborate.html for how cross-field work is handled",
      "docs/progress.html for sprint and proof tracking",
    ],
    areas: ["docs/", "community_guides/", "projects/", "operations/"],
    access: "Public docs and planning surface. Some active build threads are private or collaborator-only.",
  },
  {
    key: "hackclub",
    title: "HACKCLUB",
    href: COMMUNITY_LINKS.hackclub,
    match: ["python", "automation", "data", "ai", "analysis", "agents", "script"],
    bestFor: "Python-first learning and practical work across AI, automation, data analysis, web, and local dev agents.",
    learnFrom: [
      "README.md and foundation.md first",
      "AI/ for AI-related builds and experiments",
      "AUTOMATION/ for productivity and systems automation",
      "DATAANALYSIS/ for analytics and dataset work",
      "WEB/ for web-facing experiments",
      "Local_dev_agent/ for agent and local tooling work",
      "docs/ for supporting explanations",
    ],
    areas: ["AI/", "AUTOMATION/", "DATAANALYSIS/", "WEB/", "Local_dev_agent/", "docs/"],
    access: "Repo surface is public, but deeper collaboration lanes may be private. Send your email or message the WhatsApp group for collaborator routing.",
  },
  {
    key: "javascript",
    title: "JAVASCRIPT",
    href: COMMUNITY_LINKS.javascript,
    match: ["javascript", "js", "web", "frontend", "backend", "node", "browser"],
    bestFor: "Practical JavaScript systems training for web behavior, app logic, samples, and project work.",
    learnFrom: [
      "course/ for structured learning material",
      "docs/ for reference material",
      "projects/ for project work",
      "javascript-training/ for guided practice",
      "samplesreact/ for React examples",
      "easyshare/ for app ideas and sharing flows",
    ],
    areas: ["course/", "docs/", "projects/", "javascript-training/", "samplesreact/", "easyshare/"],
    access: "Useful for public learning; advanced team work and active issue lanes may require collaborator access.",
  },
  {
    key: "typescript",
    title: "TYPESCRIPT",
    href: COMMUNITY_LINKS.typescript,
    match: ["typescript", "typed", "large codebase", "infra", "packages", "full stack"],
    bestFor: "Typed app and package work for stronger team-ready structure.",
    learnFrom: [
      "docs/ for the high-level entry",
      "apps/ for working application surfaces",
      "packages/ for reusable modules",
      "infra/ for infrastructure-oriented work",
      "tools/ for supporting tooling",
    ],
    areas: ["docs/", "apps/", "packages/", "infra/", "tools/"],
    access: "Best for intermediate+ builders who want more structure. Ask for access if you want to contribute to private packages or active apps.",
  },
  {
    key: "dart",
    title: "DARTANDFLUTTER",
    href: COMMUNITY_LINKS.dart,
    match: ["flutter", "dart", "mobile", "android", "ios", "cross-platform", "desktop app"],
    bestFor: "Cross-platform application work across app surfaces, packages, tools, and scripts.",
    learnFrom: [
      "docs/ for the entry layer",
      "apps/ for working applications",
      "packages/ for shared components",
      "scripts/ and tools/ for build and workflow support",
    ],
    areas: ["docs/", "apps/", "packages/", "scripts/", "tools/"],
    access: "Good for mobile and cross-platform contributors. Ask to be added if you want to work in active private apps.",
  },
  {
    key: "visuals",
    title: "VISUALSANDHCI",
    href: COMMUNITY_LINKS.visuals,
    match: ["design", "ui", "ux", "gui", "hci", "graphics", "visual", "accessibility"],
    bestFor: "Visual systems, graphics, UI, UX, HCI, accessibility, and product experience work.",
    learnFrom: ["docs/ for the entry path and visual/human-centered references"],
    areas: ["docs/"],
    access: "Use this if you are shaping the interface, flow, or visual thinking of a system.",
  },
  {
    key: "go",
    title: "GO / LEARNGO",
    href: COMMUNITY_LINKS.go,
    match: ["go", "golang", "backend systems", "distributed", "system design", "financial systems"],
    bestFor: "Structured Go learning from setup to distributed and real-world systems.",
    learnFrom: [
      "1SETUP and 2BASICS first",
      "COURSE/ for structured material",
      "PROJECTS/ for build targets",
      "6SYSTEMDESIGN onward for heavier systems work",
      "9DISTRIBUTEDSYSTEMS and 10REALWORDSTACK for advanced architecture",
    ],
    areas: ["1SETUP/", "2BASICS/", "COURSE/", "PROJECTS/", "6SYSTEMDESIGN/", "9DISTRIBUTEDSYSTEMS/"],
    access: "Good for backend/system builders who want a more systems-oriented path.",
  },
  {
    key: "church",
    title: "Church Management",
    href: COMMUNITY_LINKS.appsHub,
    match: ["church", "religion", "management system", "community management", "attendance", "members"],
    bestFor: "Religion management and organization systems, including the church management app.",
    learnFrom: [
      "church_management_app/ for the working app surface",
      "ChurchManagement/ and local_church_management/ for broader context and supporting work",
    ],
    areas: ["church_management_app/"],
    access: "Relevant if you want to improve or extend religion/community management systems. Contact the team for deeper repo access.",
  },
];

const LIVE_PRODUCTS = [
  {
    title: "Read And Analyze",
    href: COMMUNITY_LINKS.pdfReader,
    capability:
      "Read, process, and analyze documents; extract text; generate questions and notes; and use AI chat in a cleaner UI.",
    localFocus: ["readandanalyze/lib", "readandanalyze/readandanalyzeapi", "readandanalyze/ocr"],
  },
  {
    title: "Examination Manager",
    href: COMMUNITY_LINKS.examManager,
    capability:
      "Run CBT-style examinations, prepare for exams, generate questions, and manage exam workflows.",
    localFocus: ["cbt/lib", "cbt/web", "cbt/plan.md"],
  },
  {
    title: "Task Manager",
    href: COMMUNITY_LINKS.taskManager,
    capability:
      "Manage tasks and activities, start/stop/pause/resume work, and structure personal productivity.",
    localFocus: ["task_manager/lib", "task_manager/docs", "task_manager/functions", "task_manager/ARCHITECTURE_GUIDE.md"],
  },
  {
    title: "Religion Management System",
    href: COMMUNITY_LINKS.appsHub,
    capability:
      "Support religion/church management, community records, and broader organization workflows.",
    localFocus: ["church_management_app/lib", "church_management_app/web"],
  },
];

const PROJECT_FOCUS = [
  {
    match: ["read and analyze", "readandanalyze", "pdf", "document", "ocr", "notes", "question generation"],
    title: "Read And Analyze",
    repoTitle: "DARTANDFLUTTER / Read And Analyze",
    areas: ["readandanalyze/lib", "readandanalyze/readandanalyzeapi", "readandanalyze/ocr"],
    learnFrom: ["product UI flow", "document processing", "OCR and backend integration"],
    href: COMMUNITY_LINKS.pdfReader,
  },
  {
    match: ["exam", "cbt", "question bank", "test prep", "examination manager"],
    title: "Examination Manager",
    repoTitle: "DARTANDFLUTTER / cbt",
    areas: ["cbt/lib", "cbt/web", "cbt/plan.md"],
    learnFrom: ["question generation flow", "exam session flow", "web/app delivery"],
    href: COMMUNITY_LINKS.examManager,
  },
  {
    match: ["task manager", "taskmaster", "productivity", "timer", "task flow", "pause resume"],
    title: "Task Manager",
    repoTitle: "TaskManager / task_manager",
    areas: ["task_manager/lib", "task_manager/functions", "task_manager/docs", "task_manager/ARCHITECTURE_GUIDE.md"],
    learnFrom: ["capability.md", "ARCHITECTURE_GUIDE.md", "prompt and function flow"],
    href: COMMUNITY_LINKS.taskManager,
  },
  {
    match: ["church", "religion", "worship", "member records", "religion management system"],
    title: "Religion Management System",
    repoTitle: "ChurchManagement / church_management_app",
    areas: ["church_management_app/lib", "church_management_app/web"],
    learnFrom: ["community management flow", "member and records flow", "Flutter app surface"],
    href: COMMUNITY_LINKS.appsHub,
  },
  {
    match: ["local dev agent", "agent", "automation workflow", "multi agent"],
    title: "Local Dev Agent work",
    repoTitle: "HACKCLUB / Local_dev_agent",
    areas: ["Local_dev_agent/", "AI/", "AUTOMATION/"],
    learnFrom: ["agent experimentation", "automation flow", "AI-assisted local workflows"],
    href: COMMUNITY_LINKS.hackclub,
  },
];

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

function uniquePush(list, item) {
  if (!item || !item.title) return;
  if (!list.some((entry) => entry.title === item.title)) list.push(item);
}

function buildRepoSuggestion(repo, reason) {
  return {
    title: repo.title,
    description: `${repo.bestFor} Start in ${repo.learnFrom.slice(0, 2).join(" and ")}. ${reason || repo.access}`,
    href: repo.siteHref || repo.href,
    repoHref: repo.href,
    kind: "repo",
    areas: repo.areas,
    learnFrom: repo.learnFrom,
    access: repo.access,
  };
}

function buildAccessSuggestion(profile = {}, reason = "") {
  const hasEmail = Boolean(profile.email);
  const desc = hasEmail
    ? `You already shared an email, so the next move is to send a structured request for collaborator access through WhatsApp or email. ${reason}`.trim()
    : `If you need deeper repo access, send your email and build interest through WhatsApp or email so the team can add you as a collaborator where appropriate. ${reason}`.trim();
  return {
    title: "Request collaborator access",
    description: desc,
    href: COMMUNITY_LINKS.whatsappGroup,
    altHref: COMMUNITY_LINKS.email,
    kind: "access",
  };
}

function buildProductSuggestion(product) {
  return {
    title: product.title,
    description: `${product.capability} You can use it now, review it, suggest upgrades, or propose a new related feature.`,
    href: product.href,
    kind: "product",
    localFocus: product.localFocus,
  };
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

  uniquePush(suggestions, {
    title: "Join Discord",
    description: "Best place for fast discussion, project matching, and posting your intent.",
    href: COMMUNITY_LINKS.discord,
    kind: "community",
  });

  const repoMatches = REPO_GUIDES.filter((repo) => repo.match.some((term) => haystack.includes(term)));
  if (!repoMatches.length || hasAny(haystack, ["not sure", "unsure", "confused", "lost"])) {
    uniquePush(
      suggestions,
      buildRepoSuggestion(REPO_GUIDES.find((repo) => repo.key === "intro"), "This is the safest first move if you want a clear path.")
    );
    uniquePush(
      suggestions,
      buildRepoSuggestion(
        REPO_GUIDES.find((repo) => repo.key === "tech-community"),
        "Use this as the hub for roles, projects, and next-step navigation."
      )
    );
  } else {
    repoMatches.slice(0, 3).forEach((repo) => {
      uniquePush(suggestions, buildRepoSuggestion(repo));
    });
  }

  if (hasAny(haystack, ["private", "collaborator", "access", "join repo", "contribute", "work on"])) {
    uniquePush(suggestions, buildAccessSuggestion(profile, "This is how you get routed into private or active build lanes."));
  }

  if (hasAny(haystack, ["call", "meeting", "poll", "vote", "activity", "video first", "domain expert", "designer", "operator"])) {
    uniquePush(suggestions, {
      title: "Calls and Polls",
      description: "See the role-based call planning and poll structure so you can join the right field/role discussion.",
      href: COMMUNITY_LINKS.calls,
      kind: "page",
    });
    uniquePush(suggestions, {
      title: "Next Activities",
      description: "Track what the community is doing next, including role-specific meetings, content priorities, and live build activities.",
      href: COMMUNITY_LINKS.activities,
      kind: "page",
    });
  }

  if (hasAny(haystack, ["path", "career", "field", "monetize", "learn effectively", "ai", "automation", "how tech helps"])) {
    uniquePush(suggestions, {
      title: "Helpful Blog Posts",
      description: "Use the blog/guidance layer for pathfinding, tech-in-your-field, learning, monetization, and AI/automation direction.",
      href: COMMUNITY_LINKS.blog,
      kind: "page",
    });
  }

  if (hasAny(haystack, ["read", "document", "pdf", "analyze", "exam", "cbt", "task", "productivity", "tool", "app", "web app", "church"])) {
    LIVE_PRODUCTS.forEach((product) => {
      if (
        hasAny(haystack, product.title.toLowerCase().split(/\s+/)) ||
        hasAny(haystack, ["document", "pdf", "exam", "cbt", "task", "productivity", "church", "religion", "management", "app"])
      ) {
        uniquePush(suggestions, buildProductSuggestion(product));
      }
    });
  }

  if (hasAny(haystack, ["hardware", "embedded", "robotics", "physical", "electrical", "mechanical", "civil", "medical device"])) {
    uniquePush(suggestions, {
      title: "Escalate to WhatsApp group",
      description:
        "This sounds like a hardware, physical, or deeper domain-specific requirement. Use the WhatsApp handoff so the right people can respond directly.",
      href: COMMUNITY_LINKS.whatsappGroup,
      kind: "handoff",
    });
  }

  uniquePush(suggestions, {
    title: "Subscribe on YouTube",
    description: "Follow the teaching and public-build layer so you can keep learning from live walkthroughs and videos.",
    href: COMMUNITY_LINKS.youtube,
    kind: "community",
  });

  if (profile.email) {
    uniquePush(suggestions, {
      title: "Email for repo access",
      description: "If you need deeper repo access or a collaborator invite, send a direct email with your domain, goal, and what part you want to work on.",
      href: COMMUNITY_LINKS.email,
      kind: "contact",
    });
  }

  return suggestions.slice(0, 7);
}

function summarizeProjectFocus(profile = {}, questionText = "") {
  const haystack = [profile.repo_interest, questionText, profile.current_goal, profile.domain].filter(Boolean).join(" ").toLowerCase();
  const focus = PROJECT_FOCUS.find((item) => item.match.some((term) => haystack.includes(term)));
  if (!focus) return null;
  return {
    title: focus.title,
    repoTitle: focus.repoTitle,
    areas: focus.areas,
    learnFrom: focus.learnFrom,
    href: focus.href,
  };
}

function summarizeRepoArea(profile = {}, questionText = "") {
  const haystack = [profile.repo_interest, questionText, profile.current_goal, profile.domain].filter(Boolean).join(" ").toLowerCase();
  const repo = REPO_GUIDES.find((item) => item.match.some((term) => haystack.includes(term))) || REPO_GUIDES[0];
  return {
    repoTitle: repo.title,
    repoHref: repo.href,
    areas: repo.areas,
    learnFrom: repo.learnFrom,
    access: repo.access,
  };
}

function needsHumanHandoff(profile = {}, questionText = "") {
  const haystack = [profile.domain, questionText, profile.current_goal].filter(Boolean).join(" ").toLowerCase();
  return hasAny(haystack, [
    "hardware",
    "embedded",
    "physical",
    "mechanical",
    "electrical",
    "domain specific",
    "hospital integration",
    "factory",
    "iot",
    "sensor",
    "robot",
  ]);
}

function buildReply({ profile = {}, stepKey = "", answer = "", suggestions = [] }) {
  const domain = profile.domain || "your field";
  const goal = profile.current_goal || profile.goal || "your current goal";
  const repoSummary = summarizeRepoArea(profile, answer);
  const projectFocus = summarizeProjectFocus(profile, answer);

  if (stepKey === "domain") {
    return `Great — coming from ${answer || domain} helps a lot. This community is built for both technical and non-technical fields, so we can route you into the right repo, people, and project lane instead of forcing you into a generic track.`;
  }

  if (stepKey === "email") {
    return "Thanks. Your email helps with follow-up, collaborator invites, private-repo routing, and making sure you are not left hanging after you post intent.";
  }

  if (stepKey === "goal") {
    return `Good. If your current focus is ${answer || goal}, we can keep the next step practical: one repo, one role direction, and one visible action.`;
  }

  if (stepKey === "repo_interest") {
    return `That path makes sense. I’ll bias the guidance around ${answer || profile.repo_interest || "that repo"}, especially around which part of the repo to start from and when to ask for collaborator access.`;
  }

  if (stepKey === "question") {
    const top = suggestions[0];
    const handoff = needsHumanHandoff(profile, answer)
      ? " Because this sounds more hardware-heavy, physical, or deeply domain-specific, you should also hand this off in the WhatsApp group so the right people can respond directly."
      : "";
    const projectLine = projectFocus
      ? ` If you want to work on ${projectFocus.title}, start around ${projectFocus.areas.slice(0, 2).join(" and ")} and review ${projectFocus.learnFrom.slice(0, 2).join(" and ")}.`
      : "";
    if (top) {
      return `Best first move: start with ${top.title}. For your situation, the most relevant working area looks like ${repoSummary.repoTitle} -> ${repoSummary.areas.slice(0, 2).join(" and ")}. Learn from ${repoSummary.learnFrom.slice(0, 2).join(" and ")} first, then ask for access if you need to go deeper into private build lanes.${projectLine}${handoff}`;
    }
    return `Based on ${domain} and your current goal around ${goal}, the next practical move is to start in ${repoSummary.repoTitle}, learn from ${repoSummary.learnFrom[0]}, and use WhatsApp or email if you need collaborator access for deeper private work.${projectLine}${handoff}`;
  }

  return "Good — that gives us enough to guide you more concretely.";
}

function buildWhatsAppHandoff(profile = {}, latestQuestion = "", suggestions = []) {
  const repoSummary = summarizeRepoArea(profile, latestQuestion);
  const projectFocus = summarizeProjectFocus(profile, latestQuestion);
  const topSuggestions = suggestions.slice(0, 3).map((item) => item.title).join(", ");
  const lines = [
    "Hello Tech Community team,",
    "",
    "I want to join and start acting quickly.",
    `Name: ${profile.name || ""}`,
    `Email: ${profile.email || ""}`,
    `Field / Domain: ${profile.domain || ""}`,
    `Current goal: ${profile.current_goal || profile.goal || ""}`,
    `Skill level: ${profile.skill_level || ""}`,
    `Repo interest: ${profile.repo_interest || repoSummary.repoTitle}`,
    `Relevant repo areas: ${repoSummary.areas.join(", ")}`,
    `Recommended learning references: ${repoSummary.learnFrom.join("; ")}`,
    `What I want to work on: ${latestQuestion || ""}`,
    `Suggested first routes: ${topSuggestions || "Need routing help"}`,
    "",
    "Please help me with:",
    "- the right repo/path",
    "- collaborator access if needed",
    "- the right project or sprint",
    "- the best next action this week",
  ];
  if (projectFocus) {
    lines.splice(
      11,
      0,
      `Relevant project lane: ${projectFocus.title}`,
      `Project build areas: ${projectFocus.areas.join(", ")}`,
      `Project references: ${projectFocus.learnFrom.join("; ")}`
    );
  }
  return {
    text: lines.join("\n").trim(),
    groupHref: COMMUNITY_LINKS.whatsappGroup,
    genericWhatsAppHref: `https://wa.me/?text=${encodeURIComponent(lines.join("\n").trim())}`,
  };
}

module.exports = {
  COMMUNITY_LINKS,
  REPO_GUIDES,
  LIVE_PRODUCTS,
  getFlow,
  getStep,
  nextStepForCompletedKeys,
  buildSuggestions,
  buildReply,
  summarizeRepoArea,
  summarizeProjectFocus,
  buildWhatsAppHandoff,
  needsHumanHandoff,
};
