import React from "react";
import { Rocket } from "lucide-react";
import { Pie, PieChart, Cell } from "recharts";
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
    { name: "Succeeded", value: data.succeeded, fill: "hsl(142 76% 60%)" },
    { name: "Failed", value: data.failed, fill: "hsl(0 84% 70%)" },
    { name: "Others", value: data.others || 0, fill: "hsl(25 95% 65%)" },
  ].filter((item) => item.value > 0);

  const chartConfig = {
    value: { label: "Releases" },
  };

  // Data loaded state
  return (
    <div className="bg-card rounded-lg border border-border p-4 flex flex-col sm:flex-row gap-6">
      {/* Left: Content - 2/3 width */}
      <div className="flex-[2] space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          Releases
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground">{data.totalReleases}</p>
            <p className="text-xs text-muted-foreground">Total Releases</p>
          </div>

          <div className="min-w-0">
            <p className="text-xl font-semibold text-green-600 dark:text-green-400">
              {data.succeeded}
            </p>
            <p className="text-xs text-muted-foreground">Succeeded</p>
          </div>

          <div className="min-w-0">
            <p className="text-xl font-semibold text-red-600 dark:text-red-400">{data.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>

          <div className="min-w-0">
            <p className="text-xl font-semibold text-orange-600 dark:text-orange-400">
              {data.others || 0}
            </p>
            <p className="text-xs text-muted-foreground">Others</p>
          </div>
        </div>

        <div className="pt-3 border-t border-border text-xs text-muted-foreground">
          Success Rate: {data.successRate}% • Failed Environments: {data.failedEnvironments}
        </div>
      </div>

      {/* Right: Pie Chart - 1/3 width */}
      {chartData.length > 0 && (
        <div className="flex-[1] hidden sm:flex items-center justify-center">
          <ChartContainer config={chartConfig} className="h-[160px] w-[160px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}
