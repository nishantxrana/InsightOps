import { Rocket } from "lucide-react";
import { Bar, BarChart, Cell, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

function SectionShell({ children }) {
  return <div className="rounded-panel border border-border bg-surface p-4">{children}</div>;
}

function SectionTitle() {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
      <Rocket className="size-4 text-muted-foreground" aria-hidden="true" />
      Releases
    </h3>
  );
}

export default function ReleasesSection({ data }) {
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

  if (data.totalReleases === 0) {
    return (
      <SectionShell>
        <SectionTitle />
        <p className="text-sm text-muted-foreground">
          No releases found in the selected date range.
        </p>
      </SectionShell>
    );
  }

  const chartData = [
    { name: "Succeeded", value: data.succeeded, fill: "hsl(var(--chart-3))" },
    { name: "Failed", value: data.failed, fill: "hsl(var(--chart-5))" },
    { name: "Others", value: data.others || 0, fill: "hsl(var(--chart-4))" },
  ].filter((item) => item.value > 0);

  const chartConfig = {
    value: { label: "Releases" },
    Succeeded: { label: "Succeeded", color: "hsl(var(--chart-3))" },
    Failed: { label: "Failed", color: "hsl(var(--chart-5))" },
    Others: { label: "Others", color: "hsl(var(--chart-4))" },
  };

  return (
    <SectionShell>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-[2] space-y-3">
          <SectionTitle />
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {data.totalReleases}
              </p>
              <p className="text-xs text-muted-foreground">Total releases</p>
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
            Success rate:{" "}
            <span className="font-medium tabular-nums text-foreground">{data.successRate}%</span>
            {" · "}
            Failed environments:{" "}
            <span className="font-medium tabular-nums text-foreground">
              {data.failedEnvironments}
            </span>
          </div>
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
