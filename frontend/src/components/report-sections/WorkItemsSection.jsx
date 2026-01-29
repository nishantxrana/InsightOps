import React from "react";
import { CheckSquare } from "lucide-react";
import { Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Color palette for work item states
const CHART_COLORS = [
  "hsl(142 76% 60%)", // green
  "hsl(221 83% 65%)", // blue
  "hsl(0 84% 70%)", // red
  "hsl(25 95% 65%)", // orange
  "hsl(280 65% 60%)", // purple
  "hsl(340 75% 65%)", // pink
  "hsl(190 70% 60%)", // cyan
  "hsl(45 93% 60%)", // yellow
  "hsl(160 60% 55%)", // teal
  "hsl(15 80% 65%)", // coral
  "hsl(260 60% 65%)", // indigo
  "hsl(120 40% 60%)", // lime
  "hsl(300 50% 65%)", // magenta
  "hsl(200 70% 60%)", // sky
  "hsl(30 85% 60%)", // amber
  "hsl(330 65% 65%)", // rose
  "hsl(180 55% 55%)", // aqua
  "hsl(270 55% 60%)", // violet
  "hsl(150 50% 55%)", // emerald
  "hsl(10 75% 65%)", // crimson
];

export default function WorkItemsSection({ data }) {
  // Skeleton loading state
  if (!data) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          Work Items
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-8 w-16 bg-muted-foreground/20 rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-4 bg-muted-foreground/20 rounded animate-pulse"
              style={{ width: `${100 - i * 15}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (data?.error) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          Work Items
        </h3>
        <p className="text-sm text-destructive">{data.error}</p>
      </div>
    );
  }

  // Empty state
  if (data.created === 0 && data.completed === 0 && data.overdue === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          Work Items
        </h3>
        <p className="text-sm text-muted-foreground">
          No work items found in the selected date range.
        </p>
      </div>
    );
  }

  // Prepare chart data (all states with random colors)
  const chartData = data.stateDistribution
    ? Object.entries(data.stateDistribution)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value], index) => ({
          name,
          value,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        }))
    : [];

  const chartConfig = {
    value: { label: "Count" },
  };

  // Data loaded state
  return (
    <div className="bg-card rounded-lg border border-border p-4 flex flex-col sm:flex-row gap-6">
      {/* Left: Content - 2/3 width */}
      <div className="flex-[2] space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          Work Items
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="min-w-0">
            <p className="text-2xl font-bold text-foreground">{data.created}</p>
            <p className="text-xs text-muted-foreground">Created</p>
          </div>

          <div className="min-w-0">
            <p className="text-xl font-semibold text-green-600 dark:text-green-400">
              {data.completed}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>

          <div className="min-w-0">
            <p className="text-xl font-semibold text-red-600 dark:text-red-400">{data.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
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
