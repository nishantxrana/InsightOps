import { CheckSquare } from "lucide-react";
import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_COLORS = [
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-1))",
];

function SectionShell({ children }) {
  return <div className="rounded-panel border border-border bg-surface p-4">{children}</div>;
}

function SectionTitle() {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
      <CheckSquare className="size-4 text-muted-foreground" aria-hidden="true" />
      Work Items
    </h3>
  );
}

export default function WorkItemsSection({ data }) {
  if (!data) {
    return (
      <SectionShell>
        <SectionTitle />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-20" />
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

  if (data.created === 0 && data.overdue === 0) {
    return (
      <SectionShell>
        <SectionTitle />
        <p className="text-sm text-muted-foreground">
          No work items found in the selected date range.
        </p>
      </SectionShell>
    );
  }

  const chartData = data.stateDistribution
    ? Object.entries(data.stateDistribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value], index) => ({
          name,
          value,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        }))
    : [];

  const chartConfig = {
    value: { label: "Work Items" },
    ...Object.fromEntries(
      chartData.map((entry) => [entry.name, { label: entry.name, color: entry.fill }])
    ),
  };

  return (
    <SectionShell>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-[2] space-y-3">
          <SectionTitle />
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums text-foreground">{data.created}</p>
              <p className="text-xs text-muted-foreground">Total created</p>
            </div>
            <div className="min-w-0">
              <p
                className={`text-xl font-semibold tabular-nums ${
                  data.overdue > 0 ? "text-danger-foreground" : "text-foreground"
                }`}
              >
                {data.overdue || 0}
              </p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </div>

          {data.stateDistribution ? (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs text-muted-foreground">State breakdown</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(data.stateDistribution)
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([state, count]) => (
                    <div
                      key={state}
                      className="flex items-center justify-between rounded-control bg-muted/50 px-2 py-1"
                    >
                      <span className="truncate text-muted-foreground">{state}</span>
                      <span className="ml-2 font-semibold tabular-nums text-foreground">
                        {count}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
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
                    <Cell key={entry.name} fill={entry.fill} stroke="hsl(var(--background))" />
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
