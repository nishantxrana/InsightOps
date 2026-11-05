import { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Loader2, Filter } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import TimeRangeSelector from "./TimeRangeSelector";
import { InlineError } from "@/components/kit/InlineError";
import PullRequestsSection from "./report-sections/PullRequestsSection";
import PRDiscussionSection from "./report-sections/PRDiscussionSection";
import BuildsSection from "./report-sections/BuildsSection";
import ReleasesSection from "./report-sections/ReleasesSection";
import WorkItemsSection from "./report-sections/WorkItemsSection";

const REPORT_INCLUDES = [
  "Pull Requests",
  "PR Discussion Health",
  "Builds",
  "Releases",
  "Work Items",
];

const SECTION_LABELS = {
  workItems: "Work items",
  builds: "Builds",
  releases: "Releases",
  pullRequests: "Pull requests",
  prDiscussion: "PR Discussion Health",
};

export default function DevOpsActivityReport() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [productionOnly, setProductionOnly] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const [dateRange, setDateRange] = useState(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from, to, label: "7 Days", value: "7d" };
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);
    setLiveMessage("Generating report…");

    try {
      const token = localStorage.getItem("token");
      const currentOrgId = localStorage.getItem("currentOrganizationId");
      const currentProject = localStorage.getItem("currentProject");

      const url = new URL("/api/dashboard/activity-report/stream", window.location.origin);
      url.searchParams.set("startDate", dateRange.from.toISOString());
      url.searchParams.set("endDate", dateRange.to.toISOString());
      url.searchParams.set("productionOnly", productionOnly.toString());

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Organization-ID": currentOrgId,
          ...(currentProject && { "X-Project-Name": currentProject }),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to start report stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const reportSections = {};
      let buffer = "";

      let streaming = true;
      while (streaming) {
        const { done, value } = await reader.read();
        if (done) {
          streaming = false;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();

        for (const message of lines) {
          if (!message.trim()) continue;

          const eventMatch = message.match(/event: (\w+)\ndata: (.+)/s);
          if (!eventMatch) continue;

          const [, eventType, dataStr] = eventMatch;
          const data = JSON.parse(dataStr);

          if (eventType === "section") {
            const { name, data: sectionData, error: sectionError } = data;
            reportSections[name] = sectionError ? { error: sectionError } : sectionData;

            setReportData({
              pullRequests: reportSections.pullRequests || null,
              prDiscussion: reportSections.prDiscussion || null,
              builds: reportSections.builds || null,
              releases: reportSections.releases || null,
              workItems: reportSections.workItems || null,
              meta: { generatedAt: new Date().toISOString() },
            });

            const label = SECTION_LABELS[name] || name;
            setLiveMessage(`${label} section loaded`);
          } else if (eventType === "complete") {
            setReportData((prev) => ({
              ...prev,
              meta: { generatedAt: data.generatedAt, durationMs: data.duration },
            }));
            setLoading(false);
            setLiveMessage("Report generation complete");
          } else if (eventType === "error") {
            setError(data.error || "Failed to generate report");
            setLoading(false);
            setLiveMessage("");
          }
        }
      }
    } catch (err) {
      console.error("Activity report error:", err);
      setError(err.userMessage || err.message || "Failed to generate report");
      setLoading(false);
      setLiveMessage("");
    }
  };

  const handleExportPDF = async () => {
    if (!reportData) {
      setError("Please generate a report first");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const currentOrgId = localStorage.getItem("currentOrganizationId");
      const currentProject = localStorage.getItem("currentProject");

      const response = await fetch("/api/dashboard/activity-report/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Organization-ID": currentOrgId,
          ...(currentProject && { "X-Project-Name": currentProject }),
        },
        body: JSON.stringify({
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
          reportData: reportData,
          productionOnly: productionOnly,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();

      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `devops-report-${dateRange.from.toISOString().split("T")[0]}-to-${dateRange.to.toISOString().split("T")[0]}.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-panel border border-border bg-surface">
      <span className="sr-only" aria-live="polite">
        {liveMessage}
      </span>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full rounded-panel focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">DevOps Activity Report</h2>
                <p className="text-xs text-muted-foreground">
                  On-demand analytics across PRs, builds, releases, and work items
                </p>
              </div>
            </div>
            {isOpen ? (
              <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t border-border px-4 py-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Switch
                  id="production-only"
                  checked={productionOnly}
                  onCheckedChange={setProductionOnly}
                  disabled={loading}
                />
                <Label htmlFor="production-only" className="cursor-pointer text-sm">
                  Production Only
                </Label>
                {productionOnly ? (
                  <Badge variant="secondary" className="gap-1">
                    <Filter className="size-3" aria-hidden="true" />
                    Filtered
                  </Badge>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Date range</span>
                  <TimeRangeSelector value={dateRange} onChange={setDateRange} disabled={loading} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={loading}
                    className="gap-2"
                    size="sm"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    {loading ? "Generating..." : "Generate Report"}
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    disabled={loading || !reportData}
                    variant="outline"
                    className="gap-2"
                    size="sm"
                  >
                    Export PDF
                  </Button>
                </div>
              </div>
            </div>

            {error ? <InlineError message={error} onRetry={handleGenerateReport} /> : null}

            {!reportData && !loading && !error ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Report includes</p>
                <ul className="space-y-1 text-sm text-foreground">
                  {REPORT_INCLUDES.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-muted-foreground"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="pt-1 text-xs text-muted-foreground">
                  Aggregates multiple sources and may take 10–30 seconds.
                </p>
              </div>
            ) : null}

            {(reportData || loading) && (
              <div className="space-y-3">
                <WorkItemsSection data={reportData?.workItems} />
                <BuildsSection data={reportData?.builds} />
                <ReleasesSection data={reportData?.releases} />
                <PullRequestsSection data={reportData?.pullRequests} />
                <PRDiscussionSection data={reportData?.prDiscussion} />

                {reportData?.meta ? (
                  <div className="border-t border-border pt-2 text-right text-xs text-muted-foreground">
                    Generated {new Date(reportData.meta.generatedAt).toLocaleString()}
                    {reportData.meta.durationMs
                      ? ` · ${(reportData.meta.durationMs / 1000).toFixed(1)}s`
                      : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
