/**
 * Shared helpers for Work Items page (presentation only).
 */

/** Prefer webUrl; fall back to converting API url; never invent org paths. */
export function getWorkItemUrl(item) {
  if (!item) return "#";
  if (item.webUrl) return item.webUrl;

  if (item.url) {
    const match = String(item.url).match(
      /https:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_apis\/wit\/workItems\/(\d+)/
    );
    if (match) {
      const [, org, project, id] = match;
      const encodedProject = encodeURIComponent(decodeURIComponent(project));
      return `https://dev.azure.com/${org}/${encodedProject}/_workitems/edit/${id}`;
    }
    return item.url;
  }

  return `#${item.id}`;
}

export function getAssigneeFromMap(workItemId, workItemsByAssignee) {
  if (!workItemsByAssignee) return "Unassigned";
  for (const [assignee, items] of Object.entries(workItemsByAssignee)) {
    if (items.some((item) => item.id === workItemId)) return assignee;
  }
  return "Unassigned";
}

export function getAssigneeFromFields(item) {
  return item?.fields?.["System.AssignedTo"]?.displayName || "Unassigned";
}

export function getPriorityValue(item) {
  const raw = item?.fields?.["Microsoft.VSTS.Common.Priority"];
  if (raw == null || raw === "") return "None";
  return String(raw);
}

export function priorityLabel(priority) {
  switch (String(priority)) {
    case "1":
      return "P1";
    case "2":
      return "P2";
    case "3":
      return "P3";
    case "4":
      return "P4";
    default:
      return "None";
  }
}

export function priorityTone(priority) {
  switch (String(priority)) {
    case "1":
      return "danger";
    case "2":
      return "warning";
    case "3":
      return "info";
    case "4":
      return "neutral";
    default:
      return "neutral";
  }
}

export function priorityFullLabel(priority) {
  switch (String(priority)) {
    case "1":
      return "Critical";
    case "2":
      return "High";
    case "3":
      return "Medium";
    case "4":
      return "Low";
    default:
      return "None";
  }
}

/** Fix: order[1] is 0; `|| 5` wrongly pushed P1 last. */
export function sortPriorityKeys(priorities) {
  const order = { 1: 0, 2: 1, 3: 2, 4: 3, None: 4 };
  return [...priorities].sort((a, b) => (order[a] ?? 5) - (order[b] ?? 5));
}

export function isPastDue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function getInitials(name) {
  if (!name || name === "Unassigned") return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function flattenSprintItems(sprintSummary) {
  if (!sprintSummary?.workItemsByState) return [];
  const items = [];
  Object.entries(sprintSummary.workItemsByState).forEach(([state, stateItems]) => {
    stateItems.forEach((item) => {
      items.push({
        ...item,
        id: item.id,
        title: item.fields?.["System.Title"] || "No title",
        state,
        assignee: getAssigneeFromMap(item.id, sprintSummary.workItemsByAssignee),
      });
    });
  });
  return items;
}

/**
 * Shared filter bag applied to either sprint or overdue rows.
 * @param {object[]} items
 * @param {{ states: string[], assignees: string[], priorities: string[], search: string, highPriority: boolean, mode: 'sprint'|'overdue' }} filters
 */
export function applyWorkItemFilters(items, filters) {
  const {
    states = [],
    assignees = [],
    priorities = [],
    search = "",
    highPriority = false,
    mode,
  } = filters;

  let filtered = items;

  if (states.length > 0) {
    filtered = filtered.filter((item) => {
      const state = mode === "overdue" ? item.fields?.["System.State"] : item.state;
      return states.includes(state);
    });
  }

  if (assignees.length > 0) {
    filtered = filtered.filter((item) => {
      const assignee =
        mode === "overdue" ? getAssigneeFromFields(item) : item.assignee || "Unassigned";
      return assignees.includes(assignee);
    });
  }

  if (highPriority) {
    filtered = filtered.filter((item) => {
      const p = getPriorityValue(item);
      return p === "1" || p === "2";
    });
  } else if (priorities.length > 0) {
    filtered = filtered.filter((item) => priorities.includes(getPriorityValue(item)));
  }

  const q = search.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((item) => {
      const title =
        mode === "overdue"
          ? item.fields?.["System.Title"] || ""
          : item.title || item.fields?.["System.Title"] || "";
      return title.toLowerCase().includes(q) || String(item.id).includes(q);
    });
  }

  return filtered;
}

export function buildStateOptions(items, mode) {
  const counts = new Map();
  items.forEach((item) => {
    const state = mode === "overdue" ? item.fields?.["System.State"] : item.state;
    if (!state) return;
    counts.set(state, (counts.get(state) || 0) + 1);
  });
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({ value, label: value, count }));
}

export function buildAssigneeOptions(items, mode) {
  const counts = new Map();
  items.forEach((item) => {
    const assignee =
      mode === "overdue" ? getAssigneeFromFields(item) : item.assignee || "Unassigned";
    counts.set(assignee, (counts.get(assignee) || 0) + 1);
  });
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({ value, label: value, count }));
}

export function buildPriorityOptions(items) {
  const counts = new Map();
  items.forEach((item) => {
    const p = getPriorityValue(item);
    counts.set(p, (counts.get(p) || 0) + 1);
  });
  return sortPriorityKeys([...counts.keys()]).map((value) => ({
    value,
    label: value === "None" ? "None" : priorityLabel(value),
    count: counts.get(value) || 0,
  }));
}

export function parseTags(tags) {
  if (!tags) return [];
  return String(tags)
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
}
