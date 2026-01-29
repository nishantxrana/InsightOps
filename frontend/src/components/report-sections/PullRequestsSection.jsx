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
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <GitPullRequest className="h-4 w-4" />
        Pull Requests
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground">{data.totalPRs}</p>
          <p className="text-xs text-muted-foreground">Total PRs</p>
        </div>

        <div className="min-w-0">
          <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
            {data.byStatus?.active || 0}
          </p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>

        <div className="min-w-0">
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">
            {data.byStatus?.completed || 0}
          </p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>

        <div className="min-w-0">
          <p className="text-xl font-semibold text-muted-foreground">
            {data.byStatus?.abandoned || 0}
          </p>
          <p className="text-xs text-muted-foreground">Abandoned</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <ChartContainer
          config={chartConfig}
          className="h-[100px] w-full hidden sm:block mt-3 pt-3 border-t border-border"
        >
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 0 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={4} />
          </BarChart>
        </ChartContainer>
      )}

      {data.avgTimeToComplete > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <Clock className="h-3 w-3 inline mr-1" />
            Avg Time to Complete:{" "}
            <span className="font-medium text-foreground">{data.avgTimeToComplete}h</span>
          </p>
        </div>
      )}
    </div>
  );
}
