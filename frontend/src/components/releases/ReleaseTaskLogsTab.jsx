import { FileText, RefreshCw, XCircle } from "lucide-react";

import { AiInsightPanel } from "@/components/kit/AiInsightPanel";
import { InlineError } from "@/components/kit/InlineError";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { Button } from "@/components/ui/button";

/**
 * Failed task logs + Diagnose Failure via AiInsightPanel.
 */
export function ReleaseTaskLogsTab({
  failedLogs,
  loadingLogs,
  logsError,
  onRefresh,
  aiAnalysis,
  aiError,
  loadingAI,
  onDiagnose,
}) {
  const aiState = loadingAI ? "loading" : aiError ? "error" : aiAnalysis ? "ready" : "idle";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Failed Task Logs</h3>
        {!loadingLogs ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Refresh
          </Button>
        ) : null}
      </div>

      {loadingLogs ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
          Loading failed task logs…
        </div>
      ) : null}

      {logsError ? <InlineError message={logsError} onRetry={onRefresh} /> : null}

      {failedLogs && !loadingLogs ? (
        failedLogs.totalFailedTasks === 0 ? (
          <div className="rounded-panel border border-border bg-muted/40 px-4 py-6 text-center">
            <FileText className="mx-auto mb-2 size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No failed tasks found with logs</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Found {failedLogs.totalFailedTasks} failed task(s)
            </p>

            <AiInsightPanel
              title="Diagnose Failure"
              state={aiState}
              markdown={aiAnalysis || undefined}
              errorText={aiError || undefined}
              onGenerate={onDiagnose}
              onRegenerate={onDiagnose}
            />

            {failedLogs.failedTasks.map((task) => (
              <div
                key={`${task.environmentId}-${task.taskId}`}
                className="overflow-hidden rounded-panel border border-border"
              >
                <div className="flex items-start justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{task.taskName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {task.environmentName}
                      <span className="mx-1.5 text-border">·</span>
                      {task.status}
                      {task.startTime ? (
                        <>
                          <span className="mx-1.5 text-border">·</span>
                          {new Date(task.startTime).toLocaleString()}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <StatusBadge tone="danger" label="Failed" />
                </div>

                <div className="space-y-2 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    Console Output
                  </div>
                  {task.logContent ? (
                    <pre className="max-h-64 overflow-auto rounded-control border border-border bg-muted p-3 font-mono text-[12px] leading-relaxed text-foreground whitespace-pre-wrap">
                      {task.logContent}
                    </pre>
                  ) : (
                    <p className="rounded-control bg-muted/50 px-3 py-4 text-center text-sm text-muted-foreground">
                      No log content available
                    </p>
                  )}

                  {task.issues?.length > 0 ? (
                    <ul className="space-y-1">
                      {task.issues.map((issue, issueIndex) => (
                        <li
                          key={issueIndex}
                          className="flex items-start gap-1.5 text-sm text-danger-foreground"
                        >
                          <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                          <span>{issue.message || issue}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
