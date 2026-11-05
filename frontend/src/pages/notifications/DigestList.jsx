import { Download, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/shadcn-io/copy-button";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { PRIORITY_LABELS } from "./constants";

function priorityLabel(priority) {
  if (priority == null || priority === "") return null;
  return PRIORITY_LABELS[priority] || String(priority);
}

function OverdueItem({ item }) {
  return (
    <li className="rounded-panel border border-border bg-background p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-mono text-sm tabular-nums text-muted-foreground">#{item.id}</span>
          {item.type ? <StatusBadge tone="neutral" label={item.type} dot={false} /> : null}
        </div>
        {item.daysPastDue > 0 ? (
          <StatusBadge tone="danger" label={`${item.daysPastDue}d overdue`} />
        ) : null}
      </div>
      <p className="mb-2 line-clamp-2 text-sm font-medium">{item.title}</p>
      <div className="grid grid-cols-1 gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
        {item.assignedTo ? <span>{item.assignedTo}</span> : null}
        {priorityLabel(item.priority) ? (
          <span>Priority: {priorityLabel(item.priority)}</span>
        ) : null}
        {item.state ? <span>{item.state}</span> : null}
        {item.dueDate ? <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span> : null}
      </div>
      {item.url ? (
        <div className="mt-2 flex items-center gap-2">
          <Button asChild variant="link" size="sm" className="h-auto px-0 text-xs">
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              View Item
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </Button>
          <CopyButton content={item.url} variant="ghost" size="sm" />
        </div>
      ) : null}
    </li>
  );
}

function IdlePrItem({ pr }) {
  return (
    <li className="rounded-panel border border-border bg-background p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="font-mono text-sm tabular-nums text-muted-foreground">#{pr.id}</span>
        {pr.idleDays > 0 ? <StatusBadge tone="warning" label={`${pr.idleDays}d idle`} /> : null}
      </div>
      <p className="mb-2 line-clamp-2 text-sm font-medium">{pr.title}</p>
      <div className="mb-2 grid grid-cols-1 gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
        {pr.repository ? <span>{pr.repository}</span> : null}
        {pr.createdBy ? <span>{pr.createdBy}</span> : null}
        {pr.sourceBranch ? (
          <span>
            {pr.sourceBranch}
            {pr.targetBranch ? ` → ${pr.targetBranch}` : ""}
          </span>
        ) : null}
        {pr.createdDate ? (
          <span>Created: {new Date(pr.createdDate).toLocaleDateString()}</span>
        ) : null}
      </div>
      {pr.url ? (
        <div className="flex items-center gap-2">
          <Button asChild variant="link" size="sm" className="h-auto px-0 text-xs">
            <a href={pr.url} target="_blank" rel="noopener noreferrer">
              View PR
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </Button>
          <CopyButton content={pr.url} variant="ghost" size="sm" />
        </div>
      ) : null}
    </li>
  );
}

/**
 * Overdue work-item or idle-PR digest list with export.
 * @param {{
 *   kind: 'overdue' | 'idle-pr',
 *   notification: object,
 *   onExport: (notification: object) => void,
 * }} props
 */
export function DigestList({ kind, notification, onExport }) {
  const metadata = notification?.metadata || {};
  const isOverdue = kind === "overdue";
  const items = isOverdue ? metadata.items || [] : metadata.pullRequests || [];
  const count = metadata.count ?? items.length;
  const title = isOverdue ? `${count} Overdue Items` : `${count} Idle Pull Requests`;

  if (!items.length && !count) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p
          className={`text-sm font-medium ${
            isOverdue ? "text-danger-foreground" : "text-warning-foreground"
          }`}
        >
          {title}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onExport(notification)}
          className="gap-1.5"
        >
          <Download className="size-3.5" aria-hidden="true" />
          Export CSV
        </Button>
      </div>
      <ul className="max-h-96 space-y-2 overflow-y-auto">
        {isOverdue
          ? items.map((item, idx) => <OverdueItem key={item.id ?? idx} item={item} />)
          : items.map((pr, idx) => <IdlePrItem key={pr.id ?? idx} pr={pr} />)}
      </ul>
    </div>
  );
}
