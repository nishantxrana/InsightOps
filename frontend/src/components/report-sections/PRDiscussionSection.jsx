import { MessageSquare } from "lucide-react";
import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

function SectionShell({ children }) {
  return <div className="rounded-panel border border-border bg-surface p-4">{children}</div>;
}

function SectionTitle() {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
      <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
      PR Discussion Health
    </h3>
  );
}

export default function PRDiscussionSection({ data }) {
  if (!data) {
    return (
      <SectionShell>
        <SectionTitle />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </SectionShell>
    );
  }

  if (data?.error) {
    return (
      <SectionShell>
        <SectionTitle />
        <p className="text-sm text-danger-foreground">{data.error}</p>
      </SectionShell>
    );
  }

  if (data.totalThreads === 0) {
    return (
      <SectionShell>
        <SectionTitle />
        <p className="text-sm text-muted-foreground">
          No discussions found in the selected date range.
        </p>
      </SectionShell>
    );
  }

  const unresolvedThreads = data.totalThreads - data.resolvedThreads;
  const chartData = [
    {
      name: "Resolved",
      value: data.resolvedThreads,
      fill: "hsl(var(--chart-3))",
      key: "resolved",
    },
    {
      name: "Unresolved",
      value: unresolvedThreads,
      fill: "hsl(var(--chart-4))",
      key: "unresolved",
    },
  ].filter((item) => item.value > 0);

  const chartConfig = {
    resolved: { label: "Resolved", color: "hsl(var(--chart-3))" },
    unresolved: { label: "Unresolved", color: "hsl(var(--chart-4))" },
  };

  return (
    <SectionShell>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-[2] space-y-3">
          <SectionTitle />
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {data.totalThreads}
              </p>
              <p className="text-xs text-muted-foreground">Total threads</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold tabular-nums text-success-foreground">
                {data.resolvedThreads}
              </p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
            <div className="min-w-0">
              <p
                className={`text-xl font-semibold tabular-nums ${
                  unresolvedThreads > 0 ? "text-warning-foreground" : "text-foreground"
                }`}
              >
                {unresolvedThreads}
              </p>
              <p className="text-xs text-muted-foreground">Unresolved</p>
            </div>
            <div className="min-w-0">
              <p
                className={`text-xl font-semibold tabular-nums ${
                  data.prsWithUnresolvedThreads > 0 ? "text-warning-foreground" : "text-foreground"
                }`}
              >
                {data.prsWithUnresolvedThreads}
              </p>
              <p className="text-xs text-muted-foreground">PRs need review</p>
            </div>
          </div>

          <div className="border-t border-border pt-3 text-xs text-muted-foreground">
            {data.totalComments} comments ({data.avgCommentsPerPR} avg per PR) ·{" "}
            {data.prsWithComments} PRs with comments · {data.totalPRsAnalyzed} PRs analyzed
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="hidden flex-[1] items-center justify-center sm:flex">
            <ChartContainer config={chartConfig} className="h-[180px] w-[180px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  strokeWidth={1}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} stroke="hsl(var(--background))" />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}
