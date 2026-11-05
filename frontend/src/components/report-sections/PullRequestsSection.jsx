import { GitPullRequest, Clock } from "lucide-react";
import { Bar, BarChart, Cell, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

function SectionShell({ children }) {
  return <div className="rounded-panel border border-border bg-surface p-4">{children}</div>;
}

function SectionTitle() {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
      <GitPullRequest className="size-4 text-muted-foreground" aria-hidden="true" />
      Pull Requests
    </h3>
  );
}

export default function PullRequestsSection({ data }) {
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

  if (data.totalPRs === 0) {
    return (
      <SectionShell>
        <SectionTitle />
        <p className="text-sm text-muted-foreground">
          No pull requests found in the selected date range.
        </p>
      </SectionShell>
    );
  }

  const chartData = [
    {
      name: "Completed",
      value: data.byStatus?.completed || 0,
      fill: "hsl(var(--chart-3))",
    },
    {
      name: "Active",
      value: data.byStatus?.active || 0,
      fill: "hsl(var(--chart-2))",
    },
    {
      name: "Abandoned",
      value: data.byStatus?.abandoned || 0,
      fill: "hsl(var(--chart-1))",
    },
  ].filter((item) => item.value > 0);

  const chartConfig = {
    value: { label: "PRs" },
    Completed: { label: "Completed", color: "hsl(var(--chart-3))" },
    Active: { label: "Active", color: "hsl(var(--chart-2))" },
    Abandoned: { label: "Abandoned", color: "hsl(var(--chart-1))" },
  };

  return (
    <SectionShell>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-[2] space-y-3">
          <SectionTitle />
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums text-foreground">{data.totalPRs}</p>
              <p className="text-xs text-muted-foreground">Total PRs</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold tabular-nums text-info-foreground">
                {data.byStatus?.active || 0}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold tabular-nums text-success-foreground">
                {data.byStatus?.completed || 0}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold tabular-nums text-muted-foreground">
                {data.byStatus?.abandoned || 0}
              </p>
              <p className="text-xs text-muted-foreground">Abandoned</p>
            </div>
          </div>

          {data.avgTimeToComplete > 0 ? (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                <Clock className="mr-1 inline size-3" aria-hidden="true" />
                Avg time to complete:{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {data.avgTimeToComplete}h
                </span>
              </p>
            </div>
          ) : null}
        </div>

        {chartData.length > 0 ? (
          <div className="hidden flex-[1] items-center justify-center sm:flex">
            <ChartContainer config={chartConfig} className="h-[160px] w-full">
              <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                <XAxis type="number" dataKey="value" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={80}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" radius={2} maxBarSize={18}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}
