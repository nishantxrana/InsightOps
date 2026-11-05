/** Static sample data for the landing product tour. No API / auth. */

export const WORKSPACE = {
  org: "Acme",
  project: "Platform",
};

export const SIDEBAR_GROUPS = [
  {
    title: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", active: true }],
  },
  {
    title: "Development",
    items: [
      { id: "work-items", label: "Work Items", active: false },
      { id: "pipelines", label: "Pipelines", active: false },
      { id: "releases", label: "Releases", active: false },
      { id: "pull-requests", label: "Pull Requests", active: false },
    ],
  },
  {
    title: "Operations",
    items: [
      { id: "notifications", label: "Notifications", active: false },
      { id: "logs", label: "Logs", active: false },
    ],
  },
];

export const TOUR_TABS = [
  { id: "overview", label: "Overview" },
  { id: "prs", label: "Pull Requests" },
  { id: "pipelines", label: "Pipelines" },
  { id: "releases", label: "Releases" },
];

export const OVERVIEW_STATS = [
  { label: "Work Items", value: "18", sub: "12 closed", tone: "neutral" },
  { label: "Success Rate", value: "94%", sub: "7 days", tone: "success" },
  { label: "Releases", value: "4", sub: "1 waiting", tone: "warning" },
  { label: "Open PRs", value: "5", sub: "1 idle", tone: "info" },
];

export const ATTENTION_ITEMS = [
  {
    id: "att-build",
    kind: "build",
    label: "Failed builds",
    count: 1,
    detail: "api-ci #2841 failed on main",
  },
  {
    id: "att-overdue",
    kind: "work",
    label: "Overdue work items",
    count: 1,
    detail: "WI-1159 past sprint end",
  },
  {
    id: "att-pr",
    kind: "pr",
    label: "Stale pull requests",
    count: 1,
    detail: "#409 idle 3 days",
  },
];

export const BUILDS = [
  {
    id: "2841",
    definition: "api-ci",
    sourceBranch: "refs/heads/main",
    branch: "main",
    sha: "a3f9c2e",
    status: "completed",
    result: "failed",
    duration: "4m 12s",
    finishedAt: "2026-11-05T11:40:00.000Z",
    failingTask: "UnitTests",
    analysisMarkdown: `**Sample analysis**

**Likely cause:** \`AuthService.refreshToken\` timed out waiting for Redis under parallel workers.

**Failing task:** UnitTests · \`AuthService.spec.ts\`

**Suggested next step:** Bump the Redis test timeout or isolate the pool for parallel runs, then re-queue the pipeline.`,
  },
  {
    id: "2840",
    definition: "web-deploy",
    sourceBranch: "refs/heads/release/2.4",
    branch: "release/2.4",
    sha: "91b0e44",
    status: "completed",
    result: "succeeded",
    duration: "6m 48s",
    finishedAt: "2026-11-05T11:10:00.000Z",
  },
  {
    id: "2839",
    definition: "api-ci",
    sourceBranch: "refs/heads/feat/webhooks",
    branch: "feat/webhooks",
    sha: "c71d802",
    status: "completed",
    result: "succeeded",
    duration: "3m 55s",
    finishedAt: "2026-11-05T09:55:00.000Z",
  },
  {
    id: "2838",
    definition: "infra-validate",
    sourceBranch: "refs/heads/main",
    branch: "main",
    sha: "e2aa019",
    status: "inProgress",
    result: null,
    duration: "1m 08s",
    finishedAt: null,
  },
  {
    id: "2837",
    definition: "api-ci",
    sourceBranch: "refs/heads/fix/pat-mask",
    branch: "fix/pat-mask",
    sha: "b4c1d90",
    status: "completed",
    result: "succeeded",
    duration: "4m 02s",
    finishedAt: "2026-11-05T08:20:00.000Z",
  },
];

export const PULL_REQUESTS = [
  {
    id: "412",
    title: "Add webhook retry backoff",
    status: "active",
    mergeStatus: "succeeded",
    sourceBranch: "feat/webhooks",
    targetBranch: "main",
    author: "A. Chen",
    reviewers: [{ displayName: "M. Okada" }, { displayName: "J. Patel" }],
    idle: false,
    updatedAt: "2026-11-05T09:00:00.000Z",
    summaryMarkdown: `**Sample analysis**

This PR adds exponential backoff to ADO webhook delivery. Reviewers are assigned; merge is ready once the last approve lands.`,
  },
  {
    id: "409",
    title: "Fix sprint burndown timezone",
    status: "active",
    mergeStatus: "queued",
    sourceBranch: "fix/burndown-tz",
    targetBranch: "main",
    author: "M. Okada",
    reviewers: [{ displayName: "A. Chen" }],
    idle: true,
    idleDays: 3,
    updatedAt: "2026-11-02T10:00:00.000Z",
    summaryMarkdown: `**Sample analysis**

No activity for 3 days. One reviewer assigned; consider nudging or reassigning before standup.`,
  },
  {
    id: "407",
    title: "Release notes for 2.4",
    status: "active",
    mergeStatus: "succeeded",
    sourceBranch: "docs/2.4-notes",
    targetBranch: "main",
    author: "J. Patel",
    reviewers: [
      { displayName: "A. Chen" },
      { displayName: "M. Okada" },
      { displayName: "S. Rivera" },
    ],
    idle: false,
    updatedAt: "2026-11-05T07:00:00.000Z",
  },
  {
    id: "405",
    title: "Mask PAT in org list response",
    status: "active",
    mergeStatus: "succeeded",
    sourceBranch: "fix/pat-mask",
    targetBranch: "main",
    author: "S. Rivera",
    reviewers: [],
    idle: false,
    updatedAt: "2026-11-05T06:30:00.000Z",
    summaryMarkdown: `**Sample analysis**

Active PR with **no reviewers**. Assign at least one reviewer before merge.`,
  },
  {
    id: "401",
    title: "Polling interval presets",
    status: "active",
    mergeStatus: "conflicts",
    sourceBranch: "feat/poll-presets",
    targetBranch: "main",
    author: "A. Chen",
    reviewers: [{ displayName: "J. Patel" }, { displayName: "M. Okada" }],
    idle: false,
    updatedAt: "2026-11-04T16:00:00.000Z",
  },
];

export const RELEASES = [
  {
    id: "r-241",
    name: "Platform 2.4.1",
    status: "waitingForApproval",
    environments: [
      { name: "Dev", state: "succeeded" },
      { name: "Staging", state: "succeeded" },
      { name: "Production", state: "waiting" },
    ],
    createdAt: "2026-11-05T08:00:00.000Z",
  },
  {
    id: "r-240",
    name: "Platform 2.4.0",
    status: "succeeded",
    environments: [
      { name: "Dev", state: "succeeded" },
      { name: "Staging", state: "succeeded" },
      { name: "Production", state: "succeeded" },
    ],
    createdAt: "2026-11-01T12:00:00.000Z",
  },
  {
    id: "r-239",
    name: "Platform 2.3.8",
    status: "succeeded",
    environments: [
      { name: "Dev", state: "succeeded" },
      { name: "Staging", state: "succeeded" },
      { name: "Production", state: "succeeded" },
    ],
    createdAt: "2026-10-28T09:00:00.000Z",
  },
  {
    id: "r-238",
    name: "Platform 2.3.7",
    status: "inProgress",
    environments: [
      { name: "Dev", state: "succeeded" },
      { name: "Staging", state: "deploying" },
      { name: "Production", state: "pending" },
    ],
    createdAt: "2026-11-05T11:00:00.000Z",
  },
];

export const SPRINT_SNIPPET = {
  name: "Sprint 42",
  closed: 12,
  total: 18,
  percent: 68,
  overdue: [{ id: "WI-1159", title: "Release approval queue view", state: "New" }],
};
