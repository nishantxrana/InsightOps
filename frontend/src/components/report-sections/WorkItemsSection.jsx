import React from "react";
import { CheckSquare } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

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

  // Prepare chart data (top 5 states)
  const chartData = data.stateDistribution
    ? Object.entries(data.stateDistribution)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }))
    : [];

  const chartConfig = {
    value: {
      label: "Count",
      color: "hsl(var(--muted-foreground))",
    },
  };

  // Data loaded state
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <CheckSquare className="h-4 w-4" />
        Work Items
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-2xl font-bold text-foreground">{data.created}</p>
          <p className="text-xs text-muted-foreground">Created</p>
        </div>

        <div>
          <p className="text-xl font-semibold text-foreground">{data.completed}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </div>

        <div>
          <p className="text-xl font-semibold text-foreground">{data.overdue}</p>
          <p className="text-xs text-muted-foreground">Overdue</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="pt-3 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            State Distribution (Top 5):
          </p>
          <ChartContainer config={chartConfig} className="h-[140px] w-full hidden sm:block">
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 10 }}
                tickFormatter={(value) =>
                  value.length > 18 ? value.substring(0, 18) + "..." : value
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={4} />
            </BarChart>
          </ChartContainer>
          {/* Mobile: Show simple list instead of chart */}
          <div className="sm:hidden space-y-1">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate mr-2">{item.name}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
