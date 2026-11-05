import { StatusBadge } from "@/components/kit/StatusBadge";
import { StatusCallout } from "@/components/kit/StatusCallout";
import { AiInsightPanel } from "@/components/kit/AiInsightPanel";
import { AvatarStack } from "@/components/kit/AvatarStack";
import {
  buildStatus,
  prReviewState,
  releaseStatus,
  workItemState,
} from "@/components/kit/statusMaps";
import { BUILDS, PULL_REQUESTS, RELEASES, SPRINT_SNIPPET } from "./mockData";

export function BentoVisual({ id }) {
  if (id === "pipelines") {
    const failed = BUILDS.find((b) => b.result === "failed");
    return (
      <div data-ui className="space-y-2">
        <div className="flex items-center justify-between gap-2 rounded-control border border-border bg-surface px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">
              {failed.definition} #{failed.id}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {failed.branch} · {failed.sha}
            </p>
          </div>
          <StatusBadge {...buildStatus(failed)} />
        </div>
        <AiInsightPanel
          title="Sample analysis"
          provider="Sample"
          state="ready"
          markdown={failed.analysisMarkdown}
          className="text-[12px] [&_.prose]:text-[12px]"
        />
      </div>
    );
  }

  if (id === "prs") {
    const idle = PULL_REQUESTS.find((p) => p.idle);
    const none = PULL_REQUESTS.find((p) => p.reviewers.length === 0);
    return (
      <div data-ui className="space-y-2">
        {[idle, none].filter(Boolean).map((pr) => (
          <div
            key={pr.id}
            className="flex items-center justify-between gap-2 rounded-control border border-border bg-surface px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] text-foreground">{pr.title}</p>
              <p className="font-mono text-[11px] text-muted-foreground">#{pr.id}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge {...prReviewState(pr)} />
              {pr.reviewers.length ? (
                <AvatarStack people={pr.reviewers} max={2} />
              ) : (
                <span className="text-[11px] text-warning-foreground">No reviewers</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (id === "sprints") {
    return (
      <div data-ui className="rounded-control border border-border bg-surface p-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[13px] font-medium text-foreground">{SPRINT_SNIPPET.name}</p>
            <p className="text-[12px] text-muted-foreground">
              {SPRINT_SNIPPET.closed} / {SPRINT_SNIPPET.total} closed
            </p>
          </div>
          <p className="font-mono text-xl font-medium tabular-nums text-foreground">
            {SPRINT_SNIPPET.percent}%
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${SPRINT_SNIPPET.percent}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">{SPRINT_SNIPPET.overdue[0].id}</span>
          <StatusBadge {...workItemState(SPRINT_SNIPPET.overdue[0].state)} />
        </div>
      </div>
    );
  }

  if (id === "releases") {
    const waiting = RELEASES.find((r) => String(r.status).toLowerCase().includes("waiting"));
    return (
      <div data-ui className="rounded-control border border-border bg-surface p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-foreground">{waiting.name}</p>
          <StatusBadge {...releaseStatus(waiting)} />
        </div>
        <ul className="mt-2 space-y-1.5">
          {waiting.environments.map((env) => (
            <li key={env.name} className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">{env.name}</span>
              <span className="font-mono text-foreground">{env.state}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (id === "multiorg") {
    return (
      <div data-ui className="rounded-control border border-border bg-surface p-3">
        <p className="text-[11px] text-muted-foreground">Workspace</p>
        <p className="mt-1 text-[13px] font-medium text-foreground">Acme</p>
        <p className="font-mono text-[11px] text-muted-foreground">Platform</p>
        <p className="mt-2 text-[11px] text-muted-foreground">+ 2 more orgs connected</p>
      </div>
    );
  }

  if (id === "alerts") {
    return (
      <StatusCallout tone="info" title="Google Chat">
        Build failed · api-ci #2841
      </StatusCallout>
    );
  }

  if (id === "reports") {
    return (
      <div data-ui className="rounded-control border border-border bg-surface p-3 text-[12px]">
        <p className="font-medium text-foreground">Activity report</p>
        <p className="mt-1 text-muted-foreground">Last 7 days · PDF export ready</p>
      </div>
    );
  }

  return (
    <div
      data-ui
      className="rounded-control border border-border bg-surface p-3 font-mono text-[11px] text-muted-foreground"
    >
      webhooks · polling backup
    </div>
  );
}
