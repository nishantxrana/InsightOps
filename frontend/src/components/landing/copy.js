/** Locked marketing copy and FAQ — single source for page + JSON-LD. */

export const H1 = "Know what broke before standup.";

export const SUBLINE =
  "InsightOps is an Azure DevOps monitoring platform for engineering teams. See sprints, builds, pull requests, and releases in one dashboard, with optional AI analysis of failures.";

export const META_DESCRIPTION =
  "InsightOps is an Azure DevOps monitoring platform for engineering teams. See sprints, builds, PRs, and releases in one dashboard, with optional AI analysis.";

export const PAGE_TITLE = "InsightOps | Azure DevOps monitoring for engineering teams";

export const TRUST_FACTS = [
  { id: "readonly", label: "Read-only PAT" },
  { id: "encrypted", label: "Encrypted at rest" },
  { id: "server", label: "Server-side calls only" },
];

export const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "AI", href: "#ai" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "FAQ", href: "#faq" },
];

export const INTEGRATIONS = [
  { id: "ado", label: "Azure DevOps", icon: "Cloud" },
  { id: "openai", label: "OpenAI", icon: "Bot" },
  { id: "groq", label: "Groq", icon: "Zap" },
  { id: "gemini", label: "Google Gemini", icon: "Brain" },
  { id: "gchat", label: "Google Chat", icon: "MessageSquare" },
];

export const PROBLEMS = [
  "Failed pipelines buried in logs",
  "PRs idle without reviewers",
  "Sprint blockers found too late",
  "Noisy alerts across too many tabs",
];

export const SOLUTIONS = [
  "One dashboard for builds, PRs, sprints, and releases",
  "Idle PRs and overdue work items called out",
  "Optional AI diagnosis on failed builds",
  "Google Chat alerts when you want them",
];

export const BENTO = [
  {
    id: "pipelines",
    title: "Pipelines and failure analysis",
    body: "Recent builds across projects, with optional AI diagnosis when a run fails.",
    size: "large",
  },
  {
    id: "prs",
    title: "Pull request idle detection",
    body: "Open PRs, reviewers, and branches in one list—idle ones surface when nothing has moved.",
    size: "medium",
  },
  {
    id: "sprints",
    title: "Sprints and overdue work items",
    body: "Sprint progress and overdue items in one view so standup prep is a scan.",
    size: "medium",
  },
  {
    id: "releases",
    title: "Releases and approvals",
    body: "Classic releases, environments, and pending approvals without hunting portals.",
    size: "medium",
  },
  {
    id: "multiorg",
    title: "Multi-org and multi-project",
    body: "Connect several Azure DevOps orgs and switch projects without juggling tabs.",
    size: "small",
  },
  {
    id: "alerts",
    title: "Alerts to Google Chat",
    body: "Route important events to the channels your team already watches.",
    size: "small",
  },
  {
    id: "reports",
    title: "Activity reports with PDF export",
    body: "Dashboard reports you can share as a PDF when leadership asks for a snapshot.",
    size: "small",
  },
  {
    id: "webhooks",
    title: "Webhooks plus polling backup",
    body: "Realtime ADO webhooks when you can; configurable polling when you cannot.",
    size: "small",
  },
];

export const STEPS = [
  {
    n: "1",
    title: "Connect an Azure DevOps organization",
    body: "Add a read-only PAT. InsightOps stores it encrypted and calls Azure DevOps from the server.",
  },
  {
    n: "2",
    title: "See everything in one dashboard",
    body: "Builds, pull requests, releases, and sprints across the orgs and projects you connect.",
  },
  {
    n: "3",
    title: "Add AI and alerts when you want them",
    body: "Configure a provider for failure analysis and summaries, and Google Chat for alerts. Skip both if you only need visibility.",
  },
];

export const PAT_SCOPES = [
  { name: "Work Items → Read", id: "vso.work", used: "Sprints, overdue items, WIQL" },
  { name: "Build → Read", id: "vso.build", used: "Builds, timelines, failure analysis" },
  { name: "Code → Read", id: "vso.code", used: "Repos, PRs, commits, threads" },
  { name: "Release → Read", id: "vso.release", used: "Releases, environments, approvals" },
  { name: "Project and Team → Read", id: "vso.project", used: "List projects, test connection" },
];

export const FAQ = [
  {
    question: "Do I need an AI key?",
    answer:
      "No. You can monitor Azure DevOps without AI. Summaries and failure analysis need a configured provider under Settings (OpenAI, Groq, or Google Gemini).",
  },
  {
    question: "Is there a separate backend?",
    answer:
      "In production, Express serves the built SPA and the API from one process, so the browser talks same-origin /api. In development, Vite proxies /api to the local API server.",
  },
  {
    question: "Which PAT scopes do I need?",
    answer:
      "Read-only scopes: Work Items (vso.work), Build (vso.build), Code (vso.code), Release (vso.release), and Project and Team (vso.project). No write scopes are required.",
  },
  {
    question: "Does InsightOps change anything in Azure DevOps?",
    answer:
      "No. InsightOps never creates or updates work items, queues builds, posts PR comments, or creates webhook subscriptions via the PAT. Configure ADO service hooks manually if you want realtime events.",
  },
  {
    question: "Where are PATs stored?",
    answer:
      "Organization PATs are encrypted at rest on the server. API responses mask the PAT. Azure DevOps calls happen server-side; the token never reaches the browser.",
  },
  {
    question: "Can I use several organizations?",
    answer:
      "Yes. InsightOps supports multiple Azure DevOps organizations and projects. You switch context in the workspace switcher.",
  },
];

export const AI_SECTION = {
  title: "Optional AI analysis. Your provider, your key.",
  body: "Connect OpenAI, Groq, or Google Gemini under Settings. InsightOps can fall back to free models when a paid key is not configured. Monitoring works without AI.",
};

export const CLOSING = {
  title: "Put Azure DevOps in one dashboard",
};
