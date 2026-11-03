export const KPIS = [
  { label: "Build success", value: "94%", hint: "Last 7 days" },
  { label: "Open PRs", value: "12", hint: "Across projects" },
  { label: "Idle PRs", value: "3", hint: "No activity 48h+" },
  { label: "Sprint", value: "68%", hint: "Sprint 42" },
];

export const BUILDS = [
  {
    id: "2841",
    pipeline: "api-ci",
    branch: "main",
    sha: "a3f9c2e",
    status: "failed",
    duration: "4m 12s",
    time: "12m ago",
    analysis:
      "Unit test AuthService.refreshToken timed out waiting for Redis. Most likely a flaky connection pool under parallel workers—retry after bumping the test timeout, or isolate Redis in the suite.",
  },
  {
    id: "2840",
    pipeline: "web-deploy",
    branch: "release/2.4",
    sha: "91b0e44",
    status: "succeeded",
    duration: "6m 48s",
    time: "41m ago",
  },
  {
    id: "2839",
    pipeline: "api-ci",
    branch: "feat/webhooks",
    sha: "c71d802",
    status: "succeeded",
    duration: "3m 55s",
    time: "2h ago",
  },
  {
    id: "2838",
    pipeline: "infra-validate",
    branch: "main",
    sha: "e2aa019",
    status: "running",
    duration: "1m 08s",
    time: "now",
  },
];

export const PULL_REQUESTS = [
  {
    id: "412",
    title: "Add webhook retry backoff",
    author: "a.chen",
    branch: "feat/webhooks",
    status: "active",
    reviewers: 2,
    idle: false,
    time: "3h ago",
  },
  {
    id: "409",
    title: "Fix sprint burndown timezone",
    author: "m.okada",
    branch: "fix/burndown-tz",
    status: "idle",
    reviewers: 1,
    idle: true,
    time: "3d ago",
  },
  {
    id: "407",
    title: "Release notes for 2.4",
    author: "j.patel",
    branch: "docs/2.4-notes",
    status: "active",
    reviewers: 3,
    idle: false,
    time: "5h ago",
  },
];

export const SPRINT_ITEMS = [
  {
    id: "WI-1182",
    title: "Pipeline failure digest to Chat",
    type: "Feature",
    state: "Active",
    assignee: "a.chen",
  },
  {
    id: "WI-1174",
    title: "Idle PR threshold setting",
    type: "User Story",
    state: "Resolved",
    assignee: "m.okada",
  },
  {
    id: "WI-1168",
    title: "Mask PAT in org list response",
    type: "Bug",
    state: "Closed",
    assignee: "j.patel",
  },
  {
    id: "WI-1159",
    title: "Release approval queue view",
    type: "Feature",
    state: "New",
    assignee: "—",
  },
];

export const SIDEBAR_NAV = [
  { label: "Overview", active: false },
  { label: "Builds", active: true },
  { label: "Pull requests", active: false },
  { label: "Sprints", active: false },
  { label: "Releases", active: false },
];
