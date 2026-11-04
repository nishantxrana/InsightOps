/**
 * DEV-only kit showcase at `/__kit`.
 * Remove in step 10 of the UI redesign.
 */
import { useMemo, useState } from "react";
import { GitBranch, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ActiveFilters,
  AiInsightPanel,
  DataCell,
  DataHeader,
  DataHeaderCell,
  DataRow,
  DataTable,
  DensityToggle,
  DetailSheet,
  EmptyState,
  FacetFilter,
  InlineError,
  KeyValueList,
  PageError,
  PageHeader,
  ResultCount,
  SearchField,
  SegmentedFilter,
  SkeletonPanel,
  SkeletonRows,
  SkeletonStatStrip,
  SortSelect,
  StatCell,
  StatStrip,
  StatusBadge,
  StatusCallout,
  SyncButton,
  TimeAgo,
  Toolbar,
  buildStatus,
  logLevel,
  notificationSeverity,
  prReviewState,
  prStatus,
  releaseStatus,
  workItemState,
} from "@/components/kit";

const SAMPLE_BUILD = { status: "completed", result: "succeeded" };
const SAMPLE_BUILD_FAIL = { status: "completed", result: "failed" };
const SAMPLE_PR = {
  status: "active",
  mergeStatus: "succeeded",
  reviewers: [{ vote: 10 }],
};
const SAMPLE_RELEASE = { status: "waitingForApproval" };
const SAMPLE_LOG = "error";
const SAMPLE_WI = "Active";
const SAMPLE_NOTIF = { type: "build", subType: "failed", read: false };

const ROWS = [
  { id: 1, name: "ci-main", result: "succeeded", at: Date.now() - 120_000 },
  { id: 2, name: "ci-feature", result: "failed", at: Date.now() - 3_600_000 },
  { id: 3, name: "nightly", result: "partiallySucceeded", at: Date.now() - 86_400_000 },
];

export default function DesignKitPage() {
  const { theme, toggleTheme } = useTheme();
  const [search, setSearch] = useState("");
  const [facet, setFacet] = useState([]);
  const [segment, setSegment] = useState("all");
  const [sort, setSort] = useState("newest");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [aiState, setAiState] = useState("idle");
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());

  const chips = useMemo(() => facet.map((v) => ({ id: v, label: v })), [facet]);

  const openRow = (row) => {
    setSelected(row);
    setSheetOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">DEV only · remove in step 10</p>
            <h1 className="text-2xl font-semibold tracking-tight">InsightOps kit</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Shared primitives for authenticated screens. Toggle theme and density while reviewing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DensityToggle />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              {theme === "dark" ? "Light" : "Dark"}
            </Button>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">PageHeader + Sync</h2>
          <PageHeader
            title="Pipelines"
            description="Recent builds across the selected project."
            status={<StatusBadge {...buildStatus(SAMPLE_BUILD)} />}
            actions={
              <SyncButton
                isSyncing={syncing}
                lastSyncedAt={lastSynced}
                onSync={() => {
                  setSyncing(true);
                  setTimeout(() => {
                    setSyncing(false);
                    setLastSynced(new Date());
                  }, 800);
                }}
              />
            }
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Status badges</h2>
          <div className="flex flex-wrap gap-2">
            <StatusBadge {...buildStatus(SAMPLE_BUILD)} />
            <StatusBadge {...buildStatus(SAMPLE_BUILD_FAIL)} />
            <StatusBadge {...buildStatus({ status: "inProgress" })} />
            <StatusBadge {...buildStatus({ result: "partiallySucceeded" })} />
            <StatusBadge {...buildStatus({ result: "canceled" })} />
            <StatusBadge {...prStatus(SAMPLE_PR)} />
            <StatusBadge {...prStatus({ status: "abandoned" })} />
            <StatusBadge {...prReviewState(SAMPLE_PR)} />
            <StatusBadge {...prReviewState({ status: "active", mergeStatus: "conflicts" })} />
            <StatusBadge {...prReviewState({ status: "active", mergeStatus: "queued" })} />
            <StatusBadge {...prReviewState({ status: "active", mergeStatus: "pending" })} />
            <StatusBadge {...releaseStatus(SAMPLE_RELEASE)} />
            <StatusBadge {...releaseStatus({ status: "notDeployed" })} />
            <StatusBadge
              {...releaseStatus({ status: "failed", failureReason: "approval_rejected" })}
            />
            <StatusBadge {...workItemState(SAMPLE_WI)} />
            <StatusBadge {...workItemState("Done")} />
            <StatusBadge {...logLevel(SAMPLE_LOG)} />
            <StatusBadge {...logLevel("warn")} />
            <StatusBadge {...logLevel("info")} />
            <StatusBadge {...logLevel("debug")} />
            <StatusBadge {...notificationSeverity(SAMPLE_NOTIF)} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">StatStrip</h2>
          <StatStrip>
            <StatCell label="Builds" value={128} sub="24h" tone="neutral" />
            <StatCell
              label="Failed"
              value={3}
              sub="Needs attention"
              tone="danger"
              onClick={() => {}}
            />
            <StatCell label="PRs" value={12} sub="2 idle" tone="warning" to="/pull-requests" />
            <StatCell label="Deploys" value={5} sub="All healthy" tone="success" />
          </StatStrip>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Toolbar</h2>
          <Toolbar>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <SearchField value={search} onChange={setSearch} placeholder="Search builds…" />
              <FacetFilter
                label="Result"
                multiple
                value={facet}
                onChange={setFacet}
                options={[
                  { value: "succeeded", label: "Succeeded", count: 40 },
                  { value: "failed", label: "Failed", count: 3 },
                  { value: "canceled", label: "Canceled", count: 1 },
                ]}
              />
              <SegmentedFilter
                value={segment}
                onChange={setSegment}
                options={[
                  { value: "all", label: "All", count: 44 },
                  { value: "mine", label: "Mine", count: 8 },
                ]}
              />
              <SortSelect value={sort} onChange={setSort} />
            </div>
            <ResultCount shown={ROWS.length} total={44} noun="builds" />
          </Toolbar>
          <ActiveFilters
            chips={chips}
            onClear={(id) => {
              if (!id) setFacet([]);
              else setFacet((prev) => prev.filter((v) => v !== id));
            }}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">DataTable</h2>
          <DataTable>
            <DataHeader>
              <DataHeaderCell className="flex-[2]">Name</DataHeaderCell>
              <DataHeaderCell sortable sorted="asc">
                Result
              </DataHeaderCell>
              <DataHeaderCell>When</DataHeaderCell>
            </DataHeader>
            {ROWS.map((row) => (
              <DataRow key={row.id} selected={selected?.id === row.id} onClick={() => openRow(row)}>
                <DataCell className="flex-[2]" mono>
                  {row.name}
                </DataCell>
                <DataCell>
                  <StatusBadge {...buildStatus({ result: row.result })} />
                </DataCell>
                <DataCell>
                  <TimeAgo date={row.at} />
                </DataCell>
              </DataRow>
            ))}
          </DataTable>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">DetailSheet</h2>
          <Button type="button" size="sm" onClick={() => openRow(ROWS[0])}>
            Open sample detail
          </Button>
          <DetailSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            icon={<GitBranch />}
            title={selected?.name || "Build"}
            subtitle="main · #1842"
            status={selected ? <StatusBadge {...buildStatus({ result: selected.result })} /> : null}
            hasPrev
            hasNext
            onPrev={() => {}}
            onNext={() => {}}
            footer={
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSheetOpen(false)}
                >
                  Close
                </Button>
              </div>
            }
          >
            <KeyValueList
              columns={2}
              items={[
                { label: "Build ID", value: "1842", mono: true },
                { label: "Branch", value: "refs/heads/main", mono: true },
                { label: "Requested by", value: "nishant.rana" },
                { label: "Duration", value: "4m 12s", mono: true },
              ]}
            />
            <div className="mt-4">
              <StatusCallout tone="success" title="Build succeeded">
                All stages completed without errors.
              </StatusCallout>
            </div>
          </DetailSheet>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">AI insight</h2>
          <AiInsightPanel
            title="Failure analysis"
            provider="Azure OpenAI"
            state={aiState}
            markdown={
              aiState === "ready"
                ? "## Summary\nThe job failed on **npm ci** due to a lockfile mismatch.\n\n1. Regenerate `package-lock.json`\n2. Re-run the pipeline\n\nSee [docs](https://example.com)."
                : undefined
            }
            errorText="Provider timed out."
            disabledReason="Configure an AI provider in Settings."
            onGenerate={() => {
              setAiState("loading");
              setTimeout(() => setAiState("ready"), 700);
            }}
            onRegenerate={() => {
              setAiState("loading");
              setTimeout(() => setAiState("ready"), 700);
            }}
          />
          <div className="flex flex-wrap gap-2">
            {["idle", "loading", "ready", "error", "disabled"].map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAiState(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Empty / error / skeletons</h2>
          <EmptyState
            title="No builds yet"
            description="Sync from Azure DevOps or push a commit to see pipelines here."
            action={
              <Button type="button" size="sm">
                Sync now
              </Button>
            }
          />
          <InlineError message="Failed to load recent builds." onRetry={() => {}} />
          <PageError message="Organization context is missing." onRetry={() => {}} />
          <SkeletonStatStrip />
          <SkeletonRows rows={3} columns={3} />
          <SkeletonPanel />
        </section>
      </div>
    </div>
  );
}
