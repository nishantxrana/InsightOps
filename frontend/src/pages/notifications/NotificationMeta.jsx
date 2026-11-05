import { StatusBadge } from "@/components/kit/StatusBadge";
import { KeyValueList } from "@/components/kit/KeyValueList";
import { PRIORITY_LABELS } from "./constants";

function scalar(value) {
  if (value == null || typeof value === "object") return null;
  return value;
}

function priorityLabel(priority) {
  if (priority == null || priority === "") return null;
  return PRIORITY_LABELS[priority] || String(priority);
}

function pathLeaf(path) {
  if (!path) return null;
  const parts = String(path).split("\\");
  return parts[parts.length - 1] || path;
}

function buildItems(metadata) {
  if (!metadata) return [];
  const items = [];
  if (metadata.buildNumber != null) {
    items.push({ label: "Build Number", value: `#${metadata.buildNumber}` });
  }
  if (metadata.repository) items.push({ label: "Repository", value: metadata.repository });
  if (metadata.branch) items.push({ label: "Branch", value: metadata.branch });
  if (metadata.commit) items.push({ label: "Commit", value: metadata.commit, mono: true });
  if (metadata.commitMessage) {
    items.push({ label: "Commit Message", value: metadata.commitMessage });
  }
  if (metadata.reason) {
    items.push({
      label: "Trigger",
      value: String(metadata.reason)
        .replace(/([A-Z])/g, " $1")
        .trim(),
    });
  }
  if (metadata.requestedBy) items.push({ label: "Requested By", value: metadata.requestedBy });
  if (metadata.duration) items.push({ label: "Duration", value: metadata.duration });
  return items;
}

function releaseItems(metadata) {
  if (!metadata) return [];
  const items = [];
  if (metadata.releaseDefinitionName) {
    items.push({ label: "Pipeline", value: metadata.releaseDefinitionName });
  }
  if (metadata.releaseName) items.push({ label: "Release", value: metadata.releaseName });
  if (metadata.environmentName) {
    items.push({ label: "Environment", value: metadata.environmentName });
  }
  if (metadata.deployedBy) items.push({ label: "Deployed By", value: metadata.deployedBy });
  if (metadata.duration) items.push({ label: "Duration", value: metadata.duration });
  return items;
}

function workItemItems(metadata) {
  if (!metadata) return [];
  const items = [];
  if (metadata.workItemId != null) {
    items.push({ label: "Work Item ID", value: `#${metadata.workItemId}` });
  }
  const type = scalar(metadata.workItemType);
  if (type) items.push({ label: "Type", value: type });
  const state = scalar(metadata.state);
  if (state) items.push({ label: "State", value: state });
  const assigned = scalar(metadata.assignedTo);
  if (assigned) items.push({ label: "Assigned To", value: assigned });
  const priority = priorityLabel(metadata.priority);
  if (priority) items.push({ label: "Priority", value: priority });
  const area = pathLeaf(metadata.areaPath);
  if (area) items.push({ label: "Area", value: area });
  const iteration = pathLeaf(metadata.iterationPath);
  if (iteration) items.push({ label: "Iteration", value: iteration });
  if (metadata.createdBy) items.push({ label: "Created By", value: metadata.createdBy });
  if (metadata.tags) {
    const tags = String(metadata.tags)
      .split(";")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length > 0) {
      items.push({
        label: "Tags",
        value: (
          <span className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <StatusBadge key={tag} tone="neutral" label={tag} dot={false} />
            ))}
          </span>
        ),
      });
    }
  }
  return items;
}

function pullRequestItems(metadata) {
  if (!metadata) return [];
  const items = [];
  if (metadata.pullRequestId != null) {
    items.push({ label: "PR ID", value: `#${metadata.pullRequestId}` });
  }
  if (metadata.repository) items.push({ label: "Repository", value: metadata.repository });
  if (metadata.sourceBranch) items.push({ label: "Source", value: metadata.sourceBranch });
  if (metadata.targetBranch) items.push({ label: "Target", value: metadata.targetBranch });
  if (metadata.createdBy) items.push({ label: "Created By", value: metadata.createdBy });
  return items;
}

function FailedTasks({ tasks }) {
  if (!tasks?.length) return null;
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-danger-foreground">Failed Tasks ({tasks.length})</p>
      <ul className="space-y-2">
        {tasks.map((task, idx) => (
          <li
            key={`${task.taskName}-${idx}`}
            className="rounded-panel border border-danger/30 bg-danger-muted/40 p-3"
          >
            <div className="mb-2 flex flex-wrap items-start gap-2">
              <StatusBadge tone="danger" label="Failed" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{task.taskName}</p>
                {task.environmentName ? (
                  <p className="text-xs text-muted-foreground">{task.environmentName}</p>
                ) : null}
              </div>
            </div>
            {task.logContent ? (
              <div className="mt-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Error Logs</p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-control border border-border bg-background p-2 text-xs">
                  {task.logContent}
                </pre>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChangesMade({ changes }) {
  if (!changes?.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Changes Made</p>
      <ul className="space-y-1">
        {changes.map((change, idx) => (
          <li key={`${change.field}-${idx}`} className="rounded-control bg-muted/50 p-2 text-xs">
            <p className="mb-1 font-medium">{change.field}:</p>
            <p className="break-words text-muted-foreground line-through">
              From: {change.oldValue || "None"}
            </p>
            <p className="break-words font-medium text-foreground">
              To: {change.newValue || "None"}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Type-specific metadata for an expanded notification.
 * @param {{ notification: object }} props
 */
export function NotificationMeta({ notification }) {
  const { type, subType, metadata } = notification || {};
  if (!metadata) return null;

  let items = [];
  if (type === "build") items = buildItems(metadata);
  else if (type === "release") items = releaseItems(metadata);
  else if (type === "work-item") items = workItemItems(metadata);
  else if (type === "pull-request") items = pullRequestItems(metadata);

  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        <div className="rounded-panel border border-border bg-muted/30 p-3 sm:p-4">
          <KeyValueList items={items} columns={2} />
        </div>
      ) : null}

      {type === "release" ? <FailedTasks tasks={metadata.failedTasks} /> : null}

      {type === "work-item" && subType === "updated" ? (
        <ChangesMade changes={metadata.changes} />
      ) : null}
    </div>
  );
}
