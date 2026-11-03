import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock3,
  GitBranch,
  Loader2,
  Play,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { BUILDS, KPIS, PULL_REQUESTS, SIDEBAR_NAV, SPRINT_ITEMS } from "./mockData";

function StatusBadge({ status }) {
  const map = {
    succeeded: {
      label: "Succeeded",
      className: "border-transparent bg-muted text-emerald-700 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    failed: {
      label: "Failed",
      className: "border-transparent bg-muted text-red-700 dark:text-red-400",
      icon: XCircle,
    },
    running: {
      label: "Running",
      className: "border-transparent bg-muted text-azure-700 dark:text-azure-400",
      icon: Loader2,
    },
    active: {
      label: "Active",
      className: "border-transparent bg-muted text-azure-700 dark:text-azure-400",
      icon: CircleDot,
    },
    idle: {
      label: "Idle",
      className: "border-transparent bg-muted text-amber-700 dark:text-amber-400",
      icon: Clock3,
    },
  };
  const cfg = map[status] || map.active;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium",
        cfg.className
      )}
    >
      <Icon className={cn("size-3", status === "running" && "animate-spin")} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

function KpiStrip() {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-landing-hairline bg-landing-hairline sm:grid-cols-4">
      {KPIS.map((kpi) => (
        <div key={kpi.label} className="bg-landing-surface px-3 py-3 sm:px-4">
          <p className="text-[12px] text-muted-foreground">{kpi.label}</p>
          <p className="mt-1 font-mono text-xl font-medium tabular-nums tracking-tight text-foreground">
            {kpi.value}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{kpi.hint}</p>
        </div>
      ))}
    </div>
  );
}

function BuildsPanel() {
  const [openAnalysis, setOpenAnalysis] = useState(true);
  const failed = BUILDS.find((b) => b.status === "failed");

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border border-landing-hairline">
        <table className="w-full min-w-[36rem] text-left text-[13px]">
          <caption className="sr-only">Recent builds sample data</caption>
          <thead>
            <tr className="border-b border-landing-hairline bg-landing-canvas text-muted-foreground">
              <th scope="col" className="px-3 py-2 font-medium">
                Build
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Pipeline
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Branch
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Duration
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                When
              </th>
            </tr>
          </thead>
          <tbody>
            {BUILDS.map((build) => (
              <tr key={build.id} className="border-b border-landing-hairline last:border-0">
                <td className="px-3 py-2.5 font-mono tabular-nums text-foreground">#{build.id}</td>
                <td className="px-3 py-2.5 text-foreground">{build.pipeline}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1 font-mono text-[12px] text-muted-foreground">
                    <GitBranch className="size-3 shrink-0" aria-hidden="true" />
                    {build.branch}
                    <span className="text-foreground/40">·</span>
                    {build.sha}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={build.status} />
                </td>
                <td className="px-3 py-2.5 font-mono tabular-nums text-muted-foreground">
                  {build.duration}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{build.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {failed?.analysis && (
        <Collapsible open={openAnalysis} onOpenChange={setOpenAnalysis}>
          <div className="rounded-md border border-landing-hairline bg-landing-surface">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {openAnalysis ? (
                  <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
                )}
                AI analysis
                <Badge
                  variant="outline"
                  className="ml-1 rounded-md px-1.5 py-0 text-[10px] font-normal"
                >
                  Build #{failed.id}
                </Badge>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="border-t border-landing-hairline px-3 py-3 text-[13px] leading-relaxed text-muted-foreground">
                {failed.analysis}
              </p>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}
    </div>
  );
}

function PullRequestsPanel() {
  return (
    <div className="overflow-x-auto rounded-md border border-landing-hairline">
      <table className="w-full min-w-[32rem] text-left text-[13px]">
        <caption className="sr-only">Pull requests sample data</caption>
        <thead>
          <tr className="border-b border-landing-hairline bg-landing-canvas text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">
              PR
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Title
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Branch
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Status
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {PULL_REQUESTS.map((pr) => (
            <tr key={pr.id} className="border-b border-landing-hairline last:border-0">
              <td className="px-3 py-2.5 font-mono tabular-nums text-foreground">#{pr.id}</td>
              <td className="px-3 py-2.5 text-foreground">
                {pr.title}
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{pr.author}</span>
              </td>
              <td className="px-3 py-2.5 font-mono text-[12px] text-muted-foreground">
                {pr.branch}
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={pr.idle ? "idle" : "active"} />
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{pr.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SprintsPanel() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-landing-hairline bg-landing-surface px-3 py-2.5">
        <div>
          <p className="text-[13px] font-medium text-foreground">Sprint 42</p>
          <p className="text-[12px] text-muted-foreground">12 of 18 items closed</p>
        </div>
        <div className="min-w-[8rem] flex-1 sm:max-w-[12rem]">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[68%] rounded-full bg-azure-600 dark:bg-azure-500" />
          </div>
          <p className="mt-1 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
            68%
          </p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border border-landing-hairline">
        <table className="w-full min-w-[28rem] text-left text-[13px]">
          <caption className="sr-only">Sprint work items sample data</caption>
          <thead>
            <tr className="border-b border-landing-hairline bg-landing-canvas text-muted-foreground">
              <th scope="col" className="px-3 py-2 font-medium">
                ID
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Title
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Type
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                State
              </th>
            </tr>
          </thead>
          <tbody>
            {SPRINT_ITEMS.map((item) => (
              <tr key={item.id} className="border-b border-landing-hairline last:border-0">
                <td className="px-3 py-2.5 font-mono text-[12px] text-foreground">{item.id}</td>
                <td className="px-3 py-2.5 text-foreground">
                  {item.title}
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {item.assignee}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{item.type}</td>
                <td className="px-3 py-2.5">
                  <Badge variant="secondary" className="rounded-md font-normal">
                    {item.state}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProductMock({ onOpenDemo }) {
  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Sample data
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenDemo}
          className="h-auto shrink-0 gap-1.5 px-0 text-[13px] text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <Play className="size-3.5" aria-hidden="true" />
          Watch the demo video
        </Button>
      </div>

      <div
        data-ui
        className="w-full min-w-0 overflow-hidden rounded-xl border border-landing-hairline bg-landing-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.25)]"
      >
        {/* Window chrome */}
        <div className="flex items-center gap-3 border-b border-landing-hairline px-3 py-2.5">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
          </div>
          <p className="truncate font-mono text-[12px] text-muted-foreground">
            acme-eng / Platform · InsightOps
          </p>
        </div>

        <div className="flex min-h-[22rem] min-w-0">
          {/* Sidebar — desktop */}
          <aside className="hidden w-44 shrink-0 border-r border-landing-hairline bg-landing-canvas p-3 lg:block">
            <div className="rounded-md border border-landing-hairline bg-landing-surface px-2.5 py-2">
              <p className="truncate text-[12px] font-medium text-foreground">acme-eng</p>
              <p className="truncate text-[11px] text-muted-foreground">Platform</p>
            </div>
            <nav className="mt-3 space-y-0.5" aria-label="Sample app navigation">
              {SIDEBAR_NAV.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[13px]",
                    item.active
                      ? "bg-landing-surface-hover font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </div>
              ))}
            </nav>
          </aside>

          {/* Main */}
          <div className="min-w-0 flex-1 p-3 sm:p-4">
            <Tabs defaultValue="builds" className="w-full">
              <TabsList className="h-8 w-full justify-start gap-0.5 rounded-md bg-muted/70 p-0.5 sm:w-auto">
                <TabsTrigger
                  value="builds"
                  className="h-7 rounded-[6px] px-2.5 text-[12px] data-[state=active]:shadow-none"
                >
                  Builds
                </TabsTrigger>
                <TabsTrigger
                  value="prs"
                  className="h-7 rounded-[6px] px-2.5 text-[12px] data-[state=active]:shadow-none"
                >
                  Pull requests
                </TabsTrigger>
                <TabsTrigger
                  value="sprints"
                  className="h-7 rounded-[6px] px-2.5 text-[12px] data-[state=active]:shadow-none"
                >
                  Sprints
                </TabsTrigger>
              </TabsList>

              <div className="mt-3">
                <KpiStrip />
              </div>

              <TabsContent value="builds" className="mt-3 focus-visible:ring-0">
                <BuildsPanel />
              </TabsContent>
              <TabsContent value="prs" className="mt-3 focus-visible:ring-0">
                <PullRequestsPanel />
              </TabsContent>
              <TabsContent value="sprints" className="mt-3 focus-visible:ring-0">
                <SprintsPanel />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
