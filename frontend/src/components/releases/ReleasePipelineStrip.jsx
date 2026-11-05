import { Fragment } from "react";
import { ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { StatusBadge } from "@/components/kit/StatusBadge";
import { releaseStatus } from "@/components/kit/statusMaps";
import { cn } from "@/lib/utils";
import { ENV_DOT_CLASS, envCounts, envStatusTone } from "./releaseDetailHelpers";

/**
 * Compact horizontal deployment stage strip.
 * @param {{ environments?: Array<{ id: string|number, name: string, status?: string, deployedOn?: string }> }} props
 */
export function ReleasePipelineStrip({ environments = [] }) {
  if (!environments.length) return null;

  const { failedEnvCount, succeededEnvCount, totalEnvCount } = envCounts({ environments });

  const summary =
    succeededEnvCount === totalEnvCount
      ? "All environments deployed successfully"
      : failedEnvCount > 0
        ? `${failedEnvCount} of ${totalEnvCount} environment${failedEnvCount > 1 ? "s" : ""} failed`
        : `${succeededEnvCount} of ${totalEnvCount} environments deployed`;

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Deployment Pipeline</h3>
        <p className="text-xs text-muted-foreground">{summary}</p>
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {environments.map((env, index) => {
          const tone = envStatusTone(env.status);
          const badge = releaseStatus({ status: env.status });
          return (
            <Fragment key={env.id ?? `${env.name}-${index}`}>
              <div className="flex min-w-[7.5rem] shrink-0 items-center gap-2 rounded-panel border border-border bg-muted/40 px-2.5 py-2">
                <span
                  className={cn("size-2 shrink-0 rounded-full", ENV_DOT_CLASS[tone])}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground" title={env.name}>
                    {env.name}
                  </p>
                  <StatusBadge {...badge} className="mt-1 h-5 px-1.5 text-[10px]" />
                  {env.deployedOn ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(env.deployedOn), { addSuffix: true })}
                    </p>
                  ) : null}
                </div>
              </div>
              {index < environments.length - 1 ? (
                <ArrowRight
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
