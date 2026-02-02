import React from "react";
import { GitPullRequest, Clock } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export default function PullRequestsSection({ data }) {
  // Skeleton loading state
  if (!data) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <GitPullRequest className="h-4 w-4" />
          Pull Requests
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
          <div className="h-4 w-3/4 bg-muted-foreground/20 rounded animate-pulse" />
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
          <GitPullRequest className="h-4 w-4" />
          Pull Requests
        </h3>
        <p className="text-sm text-destructive">{data.error}</p>
      </div>
    );
  }

  // Empty state
  if (data.totalPRs === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <GitPullRequest className="h-4 w-4" />
          Pull Requests
        </h3>
        <p className="text-sm text-muted-foreground">
          No pull requests found in the selected date range.
        </p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = [
    { name: "Completed", value: data.byStatus?.completed || 0, fill: "hsl(142 76% 60%)" },
    { name: "Active", value: data.byStatus?.active || 0, fill: "hsl(221 83% 65%)" },
    {
      name: "Abandoned",
      value: data.byStatus?.abandoned || 0,
      fill: "hsl(var(--muted-foreground))",
    },
  ].filter((item) => item.value > 0);

  const chartConfig = {
    value: { label: "PRs" },
  };

  // Data loaded state
  return (
    <div className="bg-card rounded-lg border border-border p-4 flex flex-col sm:flex-row gap-6">
      {/* Left: Content - 2/3 width */}
      <div className="flex-[2] space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <GitPullRequest className="h-4 w-4" />
          Pull Requests
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0 text-center sm:text-left">
            <p className="text-2xl font-bold text-foreground">{data.totalPRs}</p>
            <p className="text-xs text-muted-foreground">Total PRs</p>
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
              {data.byStatus?.active || 0}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <p className="text-xl font-semibold text-green-600 dark:text-green-400">
              {data.byStatus?.completed || 0}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <p className="text-xl font-semibold text-muted-foreground">
              {data.byStatus?.abandoned || 0}
            </p>
            <p className="text-xs text-muted-foreground">Abandoned</p>
          </div>
        </div>

        {data.avgTimeToComplete > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <Clock className="h-3 w-3 inline mr-1" />
              Avg Time to Complete:{" "}
              <span className="font-medium text-foreground">{data.avgTimeToComplete}h</span>
            </p>
          </div>
        )}
      </div>

      {/* Right: Horizontal Bar Chart - 1/3 width */}
      {chartData.length > 0 && (
        <div className="flex-[1] hidden sm:flex items-center justify-center">
          <ChartContainer config={chartConfig} className="h-[160px] w-full">
            <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" dataKey="value" hide />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 11 }}
                width={80}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={5}>
                {chartData.map((entry, index) => (
                  <Bar key={`bar-${index}`} dataKey="value" fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}
