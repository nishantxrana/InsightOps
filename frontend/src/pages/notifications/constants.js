/** Shared type filter values — must match API `type` query strings. */
export const TYPE_VALUES = [
  "all",
  "build",
  "release",
  "work-item",
  "pull-request",
  "overdue",
  "idle-pr",
];

/** SegmentedFilter / Select labels (no emoji). */
export const TYPE_LABELS = {
  all: "All",
  build: "Builds",
  release: "Releases",
  "work-item": "Work Items",
  "pull-request": "PRs",
  overdue: "Overdue",
  "idle-pr": "Stale PRs",
};

/** Compact type badge labels on feed rows. */
export const TYPE_BADGE_LABELS = {
  build: "Build",
  release: "Release",
  "work-item": "Work item",
  "pull-request": "PR",
  overdue: "Overdue",
  "idle-pr": "Stale PR",
};

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

export const PRIORITY_LABELS = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
};
