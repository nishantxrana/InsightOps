/**
 * CSV Export Utility
 * Converts notification data to CSV format and triggers download.
 * Returns `{ ok, error? }` — callers show toasts; never alerts.
 */

/**
 * Escape CSV field - handles commas, quotes, and newlines
 */
const escapeCSVField = (field) => {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Convert array of objects to CSV string
 */
const arrayToCSV = (data, headers) => {
  const headerRow = headers.map((h) => escapeCSVField(h.label)).join(",");
  const dataRows = data.map((item) =>
    headers.map((h) => escapeCSVField(h.getValue(item))).join(",")
  );
  return [headerRow, ...dataRows].join("\n");
};

/**
 * Trigger CSV file download
 */
const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export Idle PRs to CSV
 * @returns {{ ok: boolean, error?: string }}
 */
export const exportIdlePRsToCSV = (notification) => {
  const pullRequests = notification.metadata?.pullRequests || [];

  if (pullRequests.length === 0) {
    return { ok: false, error: "No pull requests to export" };
  }

  const headers = [
    { label: "ID", getValue: (pr) => pr.id },
    { label: "Title", getValue: (pr) => pr.title },
    { label: "Repository", getValue: (pr) => pr.repository },
    { label: "Source Branch", getValue: (pr) => pr.sourceBranch },
    { label: "Target Branch", getValue: (pr) => pr.targetBranch },
    { label: "Created By", getValue: (pr) => pr.createdBy },
    {
      label: "Created Date",
      getValue: (pr) => (pr.createdDate ? new Date(pr.createdDate).toLocaleDateString() : ""),
    },
    { label: "Idle Days", getValue: (pr) => pr.idleDays },
    { label: "URL", getValue: (pr) => pr.url },
  ];

  const csv = arrayToCSV(pullRequests, headers);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const filename = `idle-prs-${timestamp}.csv`;

  downloadCSV(csv, filename);
  return { ok: true };
};

/**
 * Export Overdue Work Items to CSV
 * @returns {{ ok: boolean, error?: string }}
 */
export const exportOverdueItemsToCSV = (notification) => {
  const items = notification.metadata?.items || [];

  if (items.length === 0) {
    return { ok: false, error: "No overdue items to export" };
  }

  const headers = [
    { label: "ID", getValue: (item) => item.id },
    { label: "Title", getValue: (item) => item.title },
    { label: "Type", getValue: (item) => item.type },
    { label: "State", getValue: (item) => item.state },
    { label: "Assigned To", getValue: (item) => item.assignedTo },
    {
      label: "Priority",
      getValue: (item) => {
        const priorityMap = { 1: "Critical", 2: "High", 3: "Medium", 4: "Low" };
        return priorityMap[item.priority] || item.priority;
      },
    },
    {
      label: "Due Date",
      getValue: (item) => (item.dueDate ? new Date(item.dueDate).toLocaleDateString() : ""),
    },
    { label: "Days Past Due", getValue: (item) => item.daysPastDue },
    { label: "URL", getValue: (item) => item.url },
  ];

  const csv = arrayToCSV(items, headers);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
  const filename = `overdue-items-${timestamp}.csv`;

  downloadCSV(csv, filename);
  return { ok: true };
};

/**
 * Generic export — detects notification type and exports accordingly.
 * @returns {{ ok: boolean, error?: string }}
 */
export const exportNotificationToCSV = (notification) => {
  if (notification.type === "idle-pr") {
    return exportIdlePRsToCSV(notification);
  }
  if (notification.type === "overdue") {
    return exportOverdueItemsToCSV(notification);
  }
  return {
    ok: false,
    error: `Export not supported for notification type: ${notification.type}`,
  };
};
