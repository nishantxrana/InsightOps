import React from "react";
import { Rocket } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export default function ReleasesSection({ data }) {
  // Skeleton loading state
  if (!data) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          Releases
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-8 w-16 bg-muted-foreground/20 rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div className="h-4 w-full bg-muted-foreground/20 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-muted-foreground/20 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-muted-foreground/20 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (data?.error) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          Releases
        </h3>
        <p className="text-sm text-destructive">{data.error}</p>
      </div>
    );
  }

  // Empty state
  if (data.totalReleases === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          Releases
        </h3>
        <p className="text-sm text-muted-foreground">
          No releases found in the selected date range.
        </p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = [
    { name: "Succeeded", value: data.succeeded },
    { name: "Failed", value: data.failed },
    { name: "Others", value: data.others || 0 },
  ].filter((item) => item.value > 0);

  const chartConfig = {
    value: {
      label: "Releases",
      color: "hsl(var(--muted-foreground))",
    },
  };

  // Data loaded state
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Rocket className="h-4 w-4" />
        Releases
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-foreground">{data.totalReleases}</p>
            <p className="text-xs text-muted-foreground">Total Releases</p>
          </div>

          <div>
            <p className="text-xl font-semibold text-foreground">{data.succeeded}</p>
            <p className="text-xs text-muted-foreground">Succeeded</p>
          </div>

          <div>
            <p className="text-xl font-semibold text-foreground">{data.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>

          <div>
            <p className="text-xl font-semibold text-foreground">{data.others || 0}</p>
            <p className="text-xs text-muted-foreground">Others</p>
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="pt-3 border-t border-border">
            <ChartContainer config={chartConfig} className="h-[100px] w-full hidden sm:block">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={4} />
              </BarChart>
            </ChartContainer>
            {/* Mobile: Show simple list instead of chart */}
            <div className="sm:hidden space-y-1">
              {chartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-border text-xs text-muted-foreground">
          Success Rate: {data.successRate}% • Failed Environments: {data.failedEnvironments}
        </div>
      </div>
    </div>
  );
}
