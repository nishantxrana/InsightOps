import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronsUpDown, Clock, GitBranch, GitPullRequest, Pause, Play } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { StatStrip, StatCell } from "@/components/kit/StatStrip";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { StatusCallout } from "@/components/kit/StatusCallout";
import { KeyValueList } from "@/components/kit/KeyValueList";
import { AiInsightPanel } from "@/components/kit/AiInsightPanel";
import { AvatarStack } from "@/components/kit/AvatarStack";
import {
  DataTable,
  DataHeader,
  DataHeaderCell,
  DataRow,
  DataCell,
} from "@/components/kit/DataTable";
import { buildStatus, prStatus, prReviewState, releaseStatus } from "@/components/kit/statusMaps";
import { cn } from "@/lib/utils";
import { ContainedDetailPanel } from "./ContainedDetailPanel";
import {
  ATTENTION_ITEMS,
  BUILDS,
  OVERVIEW_STATS,
  PULL_REQUESTS,
  RELEASES,
  SIDEBAR_GROUPS,
  TOUR_TABS,
  WORKSPACE,
} from "./mockData";

const AUTO_MS = 6000;

/** Presentational title strip — avoids PageHeader's document-level h1. */
function TourHeader({ title, description }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-lg font-semibold tracking-tight text-foreground">{title}</p>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function branchShort(ref) {
  if (!ref) return "—";
  return String(ref).replace(/^refs\/heads\//, "");
}

function StageDots({ environments }) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Environment stages">
      {environments.map((env) => {
        const tone =
          env.state === "succeeded"
            ? "bg-success"
            : env.state === "waiting" || env.state === "deploying"
              ? "bg-warning"
              : "bg-muted-foreground/40";
        return (
          <span key={env.name} className="inline-flex items-center gap-1" title={env.name}>
            <span className={cn("size-1.5 rounded-full", tone)} aria-hidden="true" />
            <span className="sr-only">
              {env.name}: {env.state}
            </span>
          </span>
        );
      })}
      <span className="ml-1 font-mono text-[11px] text-muted-foreground">
        {environments.map((e) => e.name[0]).join(" · ")}
      </span>
    </div>
  );
}

function MiniSidebar({ activeTab }) {
  const highlight = (label) => {
    if (activeTab === "overview" && label === "Dashboard") return true;
    if (activeTab === "pipelines" && label === "Pipelines") return true;
    if (activeTab === "prs" && label === "Pull Requests") return true;
    if (activeTab === "releases" && label === "Releases") return true;
    return false;
  };

  return (
    <aside
      className="hidden w-44 shrink-0 flex-col border-r border-border bg-surface md:flex"
      aria-hidden="true"
    >
      <div className="border-b border-border p-2">
        <div className="flex items-center gap-2 px-1 py-1">
          <img src="/icon.svg" alt="" className="size-5" width={20} height={20} />
          <span className="truncate text-xs font-semibold text-foreground">InsightOps</span>
        </div>
        <button
          type="button"
          tabIndex={-1}
          className="mt-1 flex w-full items-center justify-between rounded-control border border-border bg-muted/40 px-2 py-1.5 text-left"
        >
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-medium text-foreground">
              {WORKSPACE.org}
            </span>
            <span className="block truncate font-mono text-[10px] text-muted-foreground">
              {WORKSPACE.project}
            </span>
          </span>
          <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 text-[11px]">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.title} className="mb-3">
            <p className="px-1.5 pb-1 text-[10px] font-medium text-muted-foreground">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <span
                    className={cn(
                      "block rounded-control px-1.5 py-1 text-muted-foreground",
                      highlight(item.label) && "bg-muted text-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function OverviewTab({ onOpenAttention }) {
  return (
    <div className="space-y-3">
      <TourHeader title="Overview" description={`${WORKSPACE.org} / ${WORKSPACE.project}`} />
      <StatusCallout tone="danger" title="3 items need attention">
        Failed builds, overdue work items, and stale pull requests.
      </StatusCallout>
      <div className="overflow-hidden rounded-panel border border-border bg-surface divide-y divide-border">
        {ATTENTION_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenAttention(item)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {item.kind === "build" ? (
              <GitBranch className="size-4 shrink-0 text-danger" aria-hidden="true" />
            ) : item.kind === "pr" ? (
              <GitPullRequest className="size-4 shrink-0 text-warning" aria-hidden="true" />
            ) : (
              <Clock className="size-4 shrink-0 text-danger" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-foreground">{item.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {item.count}
            </span>
          </button>
        ))}
      </div>
      <StatStrip>
        {OVERVIEW_STATS.map((s) => (
          <StatCell key={s.label} label={s.label} value={s.value} sub={s.sub} tone={s.tone} />
        ))}
      </StatStrip>
    </div>
  );
}

function PrsTab({ selectedId, onSelect, rowRefs }) {
  const filters = ["All", "Idle", "Needs reviewers"];
  return (
    <div className="space-y-3">
      <TourHeader title="Pull Requests" description="Active PRs for this project." />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick filters">
        {filters.map((f, i) => (
          <span
            key={f}
            className={cn(
              "rounded-control border border-border px-2.5 py-1 text-xs",
              i === 0 ? "bg-muted text-foreground" : "text-muted-foreground"
            )}
          >
            {f}
          </span>
        ))}
      </div>
      <DataTable maxHeight="280px">
        <DataHeader>
          <DataHeaderCell className="w-[4.5rem]">ID</DataHeaderCell>
          <DataHeaderCell className="flex-[2]">Title</DataHeaderCell>
          <DataHeaderCell className="hidden flex-1 sm:flex">Branches</DataHeaderCell>
          <DataHeaderCell className="w-24">Reviewers</DataHeaderCell>
          <DataHeaderCell className="w-28">Status</DataHeaderCell>
        </DataHeader>
        {PULL_REQUESTS.map((pr) => (
          <DataRow
            key={pr.id}
            ref={(el) => {
              if (rowRefs) rowRefs.current[`pr-${pr.id}`] = el;
            }}
            selected={selectedId === pr.id}
            onClick={() => onSelect(pr)}
            className="min-h-14 py-1.5"
          >
            <DataCell mono className="w-[4.5rem]">
              #{pr.id}
            </DataCell>
            <DataCell className="flex-[2]">
              <span className="line-clamp-1 text-foreground">{pr.title}</span>
              {pr.idle ? (
                <span className="mt-0.5 block text-[11px] text-warning-foreground">
                  Idle {pr.idleDays}d
                </span>
              ) : null}
            </DataCell>
            <DataCell mono className="hidden flex-1 sm:flex">
              <span className="line-clamp-1">
                {pr.sourceBranch} → {pr.targetBranch}
              </span>
            </DataCell>
            <DataCell className="w-24">
              {pr.reviewers.length ? (
                <AvatarStack people={pr.reviewers} max={3} />
              ) : (
                <span className="text-xs text-warning-foreground">None</span>
              )}
            </DataCell>
            <DataCell className="w-28">
              <div className="flex flex-col gap-0.5">
                <StatusBadge {...prStatus(pr)} />
                <StatusBadge {...prReviewState(pr)} dot={false} />
              </div>
            </DataCell>
          </DataRow>
        ))}
      </DataTable>
    </div>
  );
}

function PipelinesTab({ selectedId, onSelect, rowRefs }) {
  const failed = BUILDS.filter((b) => b.result === "failed").length;
  const running = BUILDS.filter((b) => b.status === "inProgress").length;
  return (
    <div className="space-y-3">
      <TourHeader title="Pipelines" description="Recent builds for the selected project." />
      <StatStrip>
        <StatCell label="Failed" value={failed} sub="24h" tone="danger" />
        <StatCell label="Running" value={running} tone="info" />
        <StatCell
          label="Succeeded"
          value={BUILDS.filter((b) => b.result === "succeeded").length}
          tone="success"
        />
        <StatCell label="Total" value={BUILDS.length} tone="neutral" />
      </StatStrip>
      <DataTable maxHeight="260px">
        <DataHeader>
          <DataHeaderCell className="w-16">Build</DataHeaderCell>
          <DataHeaderCell className="flex-1">Pipeline</DataHeaderCell>
          <DataHeaderCell className="hidden w-28 sm:flex">Branch</DataHeaderCell>
          <DataHeaderCell className="w-24">Status</DataHeaderCell>
          <DataHeaderCell className="hidden w-20 md:flex" align="right">
            Duration
          </DataHeaderCell>
        </DataHeader>
        {BUILDS.map((build) => (
          <DataRow
            key={build.id}
            ref={(el) => {
              if (rowRefs) rowRefs.current[`build-${build.id}`] = el;
            }}
            selected={selectedId === build.id}
            onClick={() => onSelect(build)}
          >
            <DataCell mono className="w-16">
              #{build.id}
            </DataCell>
            <DataCell className="flex-1">{build.definition}</DataCell>
            <DataCell mono className="hidden w-28 sm:flex">
              {build.branch}
            </DataCell>
            <DataCell className="w-24">
              <StatusBadge {...buildStatus(build)} />
            </DataCell>
            <DataCell tabular className="hidden w-20 justify-end md:flex" align="right">
              {build.duration}
            </DataCell>
          </DataRow>
        ))}
      </DataTable>
    </div>
  );
}

function ReleasesTab({ selectedId, onSelect, rowRefs }) {
  const waiting = RELEASES.filter((r) => String(r.status).toLowerCase().includes("waiting")).length;
  return (
    <div className="space-y-3">
      <TourHeader title="Releases" description="Classic releases and environment health." />
      <StatStrip>
        <StatCell label="Waiting" value={waiting} sub="approval" tone="warning" />
        <StatCell
          label="Succeeded"
          value={RELEASES.filter((r) => r.status === "succeeded").length}
          tone="success"
        />
        <StatCell
          label="In progress"
          value={RELEASES.filter((r) => r.status === "inProgress").length}
          tone="info"
        />
        <StatCell label="Total" value={RELEASES.length} tone="neutral" />
      </StatStrip>
      <DataTable maxHeight="260px">
        <DataHeader>
          <DataHeaderCell className="flex-[1.5]">Release</DataHeaderCell>
          <DataHeaderCell className="flex-1">Stages</DataHeaderCell>
          <DataHeaderCell className="w-36">Status</DataHeaderCell>
        </DataHeader>
        {RELEASES.map((rel) => (
          <DataRow
            key={rel.id}
            ref={(el) => {
              if (rowRefs) rowRefs.current[`rel-${rel.id}`] = el;
            }}
            selected={selectedId === rel.id}
            onClick={() => onSelect(rel)}
          >
            <DataCell className="flex-[1.5]">{rel.name}</DataCell>
            <DataCell className="flex-1">
              <StageDots environments={rel.environments} />
            </DataCell>
            <DataCell className="w-36">
              <StatusBadge {...releaseStatus(rel)} />
            </DataCell>
          </DataRow>
        ))}
      </DataTable>
    </div>
  );
}

export default function ProductTour() {
  const reduceMotion = useReducedMotion();
  const tabsId = useId();
  const [tabIndex, setTabIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userLocked, setUserLocked] = useState(false);
  const [detail, setDetail] = useState(null);
  const triggerRef = useRef(null);
  const rowRefs = useRef({});

  const tab = TOUR_TABS[tabIndex];
  const playing = !reduceMotion && !paused && !userLocked && !detail;

  const lockUser = useCallback(() => {
    setUserLocked(true);
    setPaused(true);
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    const id = window.setInterval(() => {
      setTabIndex((i) => (i + 1) % TOUR_TABS.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  const selectTab = (index) => {
    lockUser();
    setTabIndex(index);
    setDetail(null);
  };

  const onTabKeyDown = (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") {
      return;
    }
    e.preventDefault();
    lockUser();
    setTabIndex((i) => {
      if (e.key === "Home") return 0;
      if (e.key === "End") return TOUR_TABS.length - 1;
      if (e.key === "ArrowRight") return (i + 1) % TOUR_TABS.length;
      return (i - 1 + TOUR_TABS.length) % TOUR_TABS.length;
    });
  };

  const openDetail = (type, item, key) => {
    lockUser();
    triggerRef.current = rowRefs.current[key] || null;
    setDetail({ type, item, listKey: key });
  };

  const closeDetail = () => {
    setDetail(null);
    queueMicrotask(() => triggerRef.current?.focus?.());
  };

  const detailList =
    detail?.type === "pr"
      ? PULL_REQUESTS
      : detail?.type === "build"
        ? BUILDS
        : detail?.type === "release"
          ? RELEASES
          : detail?.type === "attention"
            ? ATTENTION_ITEMS
            : [];

  const detailIndex = detail ? detailList.findIndex((x) => x.id === detail.item.id) : -1;

  const goPrev = () => {
    if (detailIndex <= 0) return;
    const next = detailList[detailIndex - 1];
    const prefix =
      detail.type === "pr"
        ? "pr"
        : detail.type === "build"
          ? "build"
          : detail.type === "release"
            ? "rel"
            : "att";
    setDetail({ type: detail.type, item: next, listKey: `${prefix}-${next.id}` });
  };

  const goNext = () => {
    if (detailIndex < 0 || detailIndex >= detailList.length - 1) return;
    const next = detailList[detailIndex + 1];
    const prefix =
      detail.type === "pr"
        ? "pr"
        : detail.type === "build"
          ? "build"
          : detail.type === "release"
            ? "rel"
            : "att";
    setDetail({ type: detail.type, item: next, listKey: `${prefix}-${next.id}` });
  };

  const renderDetailBody = () => {
    if (!detail) return null;
    if (detail.type === "build") {
      const b = detail.item;
      return (
        <>
          <StatusCallout
            tone={b.result === "failed" ? "danger" : "neutral"}
            title={buildStatus(b).label}
          >
            {b.failingTask ? `Failing task: ${b.failingTask}` : b.definition}
          </StatusCallout>
          <KeyValueList
            columns={1}
            items={[
              { label: "Pipeline", value: b.definition },
              { label: "Branch", value: b.branch, mono: true },
              { label: "Commit", value: b.sha, mono: true },
              { label: "Duration", value: b.duration, mono: true },
            ]}
          />
          {b.analysisMarkdown ? (
            <AiInsightPanel
              title="Sample analysis"
              provider="Sample"
              state="ready"
              markdown={b.analysisMarkdown}
            />
          ) : null}
        </>
      );
    }
    if (detail.type === "pr") {
      const pr = detail.item;
      return (
        <>
          <StatusCallout
            tone={pr.idle ? "warning" : pr.reviewers.length === 0 ? "warning" : "info"}
            title={pr.idle ? `Idle ${pr.idleDays}d` : prReviewState(pr).label}
          >
            {pr.sourceBranch} → {pr.targetBranch}
          </StatusCallout>
          <KeyValueList
            columns={1}
            items={[
              { label: "Author", value: pr.author },
              { label: "Source", value: pr.sourceBranch, mono: true },
              { label: "Target", value: pr.targetBranch, mono: true },
              {
                label: "Reviewers",
                value: pr.reviewers.length
                  ? pr.reviewers.map((r) => r.displayName).join(", ")
                  : "None",
              },
            ]}
          />
          {pr.summaryMarkdown ? (
            <AiInsightPanel
              title="Sample analysis"
              provider="Sample"
              state="ready"
              markdown={pr.summaryMarkdown}
            />
          ) : null}
        </>
      );
    }
    if (detail.type === "release") {
      const rel = detail.item;
      return (
        <>
          <StatusCallout tone="warning" title={releaseStatus(rel).label}>
            {rel.environments.map((e) => `${e.name}: ${e.state}`).join(" · ")}
          </StatusCallout>
          <KeyValueList
            columns={1}
            items={rel.environments.map((e) => ({
              label: e.name,
              value: e.state,
            }))}
          />
        </>
      );
    }
    if (detail.type === "attention") {
      const item = detail.item;
      const relatedBuild = item.kind === "build" ? BUILDS.find((b) => b.result === "failed") : null;
      const relatedPr = item.kind === "pr" ? PULL_REQUESTS.find((p) => p.idle) : null;
      return (
        <>
          <StatusCallout tone="danger" title={item.label}>
            {item.detail}
          </StatusCallout>
          {relatedBuild?.analysisMarkdown ? (
            <AiInsightPanel
              title="Sample analysis"
              provider="Sample"
              state="ready"
              markdown={relatedBuild.analysisMarkdown}
            />
          ) : null}
          {relatedPr?.summaryMarkdown ? (
            <AiInsightPanel
              title="Sample analysis"
              provider="Sample"
              state="ready"
              markdown={relatedPr.summaryMarkdown}
            />
          ) : null}
        </>
      );
    }
    return null;
  };

  const detailTitle =
    detail?.type === "build"
      ? `${detail.item.definition} #${detail.item.id}`
      : detail?.type === "pr"
        ? `#${detail.item.id} ${detail.item.title}`
        : detail?.type === "release"
          ? detail.item.name
          : detail?.item?.label || "Details";

  const detailSubtitle =
    detail?.type === "build"
      ? `${branchShort(detail.item.branch)} · ${detail.item.sha}`
      : detail?.type === "pr"
        ? `${detail.item.sourceBranch} → ${detail.item.targetBranch}`
        : null;

  const detailStatus =
    detail?.type === "build" ? (
      <StatusBadge {...buildStatus(detail.item)} />
    ) : detail?.type === "pr" ? (
      <StatusBadge {...prStatus(detail.item)} />
    ) : detail?.type === "release" ? (
      <StatusBadge {...releaseStatus(detail.item)} />
    ) : null;

  return (
    <div
      className="relative overflow-hidden rounded-panel border border-landing-hairline bg-landing-surface"
      style={{ minHeight: 520 }}
      aria-label="Sample InsightOps product preview"
      onPointerDown={lockUser}
      onFocusCapture={lockUser}
    >
      {/* Window chrome */}
      <div className="flex h-9 items-center gap-2 border-b border-landing-hairline bg-surface-raised px-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2 rounded-full bg-muted-foreground/30" />
          <span className="size-2 rounded-full bg-muted-foreground/30" />
          <span className="size-2 rounded-full bg-muted-foreground/30" />
        </div>
        <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
          {WORKSPACE.org} / {WORKSPACE.project}
        </p>
        <span className="shrink-0 rounded-control border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Sample data
        </span>
        {!reduceMotion ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={(e) => {
              e.stopPropagation();
              if (userLocked) {
                setUserLocked(false);
                setPaused(false);
              } else {
                setPaused((p) => !p);
              }
            }}
            aria-label={playing ? "Pause guided tour" : "Play guided tour"}
          >
            {playing ? (
              <Pause className="size-3" aria-hidden="true" />
            ) : (
              <Play className="size-3" aria-hidden="true" />
            )}
            {playing ? "Pause" : "Play"}
          </Button>
        ) : null}
      </div>

      <div className="relative flex min-h-[480px]">
        <MiniSidebar activeTab={tab.id} />

        <div className="relative min-w-0 flex-1">
          <div className="border-b border-border px-3 pt-2">
            <div
              role="tablist"
              aria-label="Product preview tabs"
              className="flex gap-1 overflow-x-auto pb-0"
              onKeyDown={onTabKeyDown}
            >
              {TOUR_TABS.map((t, i) => {
                const selected = i === tabIndex;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    id={`${tabsId}-tab-${t.id}`}
                    aria-selected={selected}
                    aria-controls={`${tabsId}-panel-${t.id}`}
                    tabIndex={selected ? 0 : -1}
                    className={cn(
                      "shrink-0 border-b-2 px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      selected
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => selectTab(i)}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            role="tabpanel"
            id={`${tabsId}-panel-${tab.id}`}
            aria-labelledby={`${tabsId}-tab-${tab.id}`}
            className="p-3"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={tab.id}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
              >
                {tab.id === "overview" ? (
                  <OverviewTab
                    onOpenAttention={(item) => openDetail("attention", item, `att-${item.id}`)}
                  />
                ) : null}
                {tab.id === "prs" ? (
                  <PrsTab
                    selectedId={detail?.type === "pr" ? detail.item.id : null}
                    onSelect={(pr) => openDetail("pr", pr, `pr-${pr.id}`)}
                    rowRefs={rowRefs}
                  />
                ) : null}
                {tab.id === "pipelines" ? (
                  <PipelinesTab
                    selectedId={detail?.type === "build" ? detail.item.id : null}
                    onSelect={(b) => openDetail("build", b, `build-${b.id}`)}
                    rowRefs={rowRefs}
                  />
                ) : null}
                {tab.id === "releases" ? (
                  <ReleasesTab
                    selectedId={detail?.type === "release" ? detail.item.id : null}
                    onSelect={(r) => openDetail("release", r, `rel-${r.id}`)}
                    rowRefs={rowRefs}
                  />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>

          <ContainedDetailPanel
            open={Boolean(detail)}
            onClose={closeDetail}
            title={detailTitle}
            subtitle={detailSubtitle}
            status={detailStatus}
            onPrev={detailIndex > 0 ? goPrev : undefined}
            onNext={detailIndex >= 0 && detailIndex < detailList.length - 1 ? goNext : undefined}
            hasPrev={detailIndex > 0}
            hasNext={detailIndex >= 0 && detailIndex < detailList.length - 1}
          >
            {renderDetailBody()}
          </ContainedDetailPanel>
        </div>
      </div>
    </div>
  );
}
