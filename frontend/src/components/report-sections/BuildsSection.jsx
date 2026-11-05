import { GitBranch, Clock } from "lucide-react";
import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

function SectionShell({ children }) {
  return <div className="rounded-panel border border-border bg-surface p-4">{children}</div>;
}

function SectionTitle() {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
      <GitBranch className="size-4 text-muted-foreground" aria-hidden="true" />
      Builds
    </h3>
  );
}

export default function BuildsSection({ data }) {
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

  if (data.totalBuilds === 0) {
    return (
      <SectionShell>
        <SectionTitle />
        <p className="text-sm text-muted-foreground">No builds found in the selected date range.</p>
      </SectionShell>
    );
  }

  const chartData = [
    { name: "Succeeded", value: data.succeeded, fill: "hsl(var(--chart-3))", key: "succeeded" },
    { name: "Failed", value: data.failed, fill: "hsl(var(--chart-5))", key: "failed" },
    { name: "Others", value: data.others || 0, fill: "hsl(var(--chart-4))", key: "others" },
  ].filter((item) => item.value > 0);

  const chartConfig = {
    succeeded: { label: "Succeeded", color: "hsl(var(--chart-3))" },
    failed: { label: "Failed", color: "hsl(var(--chart-5))" },
    others: { label: "Others", color: "hsl(var(--chart-4))" },
  };

  return (
    <SectionShell>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-[2] space-y-3">
          <SectionTitle />
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {data.totalBuilds}
              </p>
              <p className="text-xs text-muted-foreground">Total builds</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold tabular-nums text-success-foreground">
                {data.succeeded}
              </p>
              <p className="text-xs text-muted-foreground">Succeeded</p>
            </div>
            <div className="min-w-0">
              <p
                className={`text-xl font-semibold tabular-nums ${
                  data.failed > 0 ? "text-danger-foreground" : "text-foreground"
                }`}
              >
                {data.failed}
              </p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold tabular-nums text-muted-foreground">
                {data.others || 0}
              </p>
              <p className="text-xs text-muted-foreground">Others</p>
            </div>
          </div>

          <div className="border-t border-border pt-3 text-xs text-muted-foreground">
            {data.avgDuration > 0 ? (
              <>
                <Clock className="mr-1 inline size-3" aria-hidden="true" />
                Avg duration:{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {data.avgDuration} min
                </span>
                {" · "}
              </>
            ) : null}
            Failure rate:{" "}
            <span className="font-medium tabular-nums text-foreground">{data.failureRate}%</span>
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
