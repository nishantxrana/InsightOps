import React from "react";
import { MessageSquare } from "lucide-react";
import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export default function PRDiscussionSection({ data }) {
  // Skeleton loading state
  if (!data) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          PR Discussion Health
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-8 w-16 bg-muted-foreground/20 rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <div className="h-3 w-64 bg-muted-foreground/20 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (data?.error) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          PR Discussion Health
        </h3>
        <p className="text-sm text-destructive">{data.error}</p>
      </div>
    );
  }

  // Empty state
  if (data.totalThreads === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          PR Discussion Health
        </h3>
        <p className="text-sm text-muted-foreground">
          No discussions found in the selected date range.
        </p>
      </div>
    );
  }

  // Prepare chart data
  const unresolvedThreads = data.totalThreads - data.resolvedThreads;
  const chartData = [
    { name: "Resolved", value: data.resolvedThreads, fill: "hsl(142 76% 60%)" },
    { name: "Unresolved", value: unresolvedThreads, fill: "hsl(25 95% 65%)" },
  ].filter((item) => item.value > 0);

  const chartConfig = {
    value: { label: "Threads" },
  };

  // Data loaded state
  return (
    <div className="bg-card rounded-lg border border-border p-4 flex flex-col sm:flex-row gap-6">
      {/* Left: Content - 2/3 width */}
      <div className="flex-[2] space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          PR Comments & Threads
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground">{data.totalThreads}</p>
            <p className="text-xs text-muted-foreground">Total Threads</p>
          </div>

          <div className="min-w-0">
            <p className="text-xl font-semibold text-green-600 dark:text-green-400">
              {data.resolvedThreads}
            </p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>

          <div className="min-w-0">
            <p className="text-xl font-semibold text-orange-600 dark:text-orange-400">
              {unresolvedThreads}
            </p>
            <p className="text-xs text-muted-foreground">Unresolved</p>
          </div>

          <div className="min-w-0">
            <p className="text-xl font-semibold text-orange-600 dark:text-orange-400">
              {data.prsWithUnresolvedThreads}
            </p>
            <p className="text-xs text-muted-foreground">PRs Need Review</p>
          </div>
        </div>

        <div className="pt-3 border-t border-border text-xs text-muted-foreground">
          {data.totalComments} comments ({data.avgCommentsPerPR} avg per PR) •{" "}
          {data.prsWithComments} PRs with comments • {data.totalPRsAnalyzed} PRs analyzed
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
