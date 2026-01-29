import React, { useState } from "react";
import { FileText, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import TimeRangeSelector from "./TimeRangeSelector";
import { apiService } from "../api/apiService";
import ErrorMessage from "./ErrorMessage";
import PullRequestsSection from "./report-sections/PullRequestsSection";
import PRDiscussionSection from "./report-sections/PRDiscussionSection";
import BuildsSection from "./report-sections/BuildsSection";
import ReleasesSection from "./report-sections/ReleasesSection";
import WorkItemsSection from "./report-sections/WorkItemsSection";

export default function DevOpsActivityReport() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from, to, label: "30 Days", value: "30d" };
  });

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      const token = localStorage.getItem("token");
      const currentOrgId = localStorage.getItem("currentOrganizationId");

      const url = new URL("/api/dashboard/activity-report/stream", window.location.origin);
      url.searchParams.set("startDate", dateRange.from.toISOString());
      url.searchParams.set("endDate", dateRange.to.toISOString());

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Organization-ID": currentOrgId,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to start report stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const reportSections = {};
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop(); // Keep incomplete message in buffer

        for (const message of lines) {
          if (!message.trim()) continue;

          const eventMatch = message.match(/event: (\w+)\ndata: (.+)/s);
          if (!eventMatch) continue;

          const [, eventType, dataStr] = eventMatch;
          const data = JSON.parse(dataStr);

          if (eventType === "section") {
            const { name, data: sectionData, error } = data;
            reportSections[name] = error ? { error } : sectionData;

            setReportData({
              pullRequests: reportSections.pullRequests || null,
              prDiscussion: reportSections.prDiscussion || null,
              builds: reportSections.builds || null,
              releases: reportSections.releases || null,
              workItems: reportSections.workItems || null,
              meta: { generatedAt: new Date().toISOString() },
            });
          } else if (eventType === "complete") {
            setReportData((prev) => ({
              ...prev,
              meta: { generatedAt: data.generatedAt, durationMs: data.duration },
            }));
            setLoading(false);
          } else if (eventType === "error") {
            setError(data.error || "Failed to generate report");
            setLoading(false);
          }
        }
      }
    } catch (err) {
      console.error("Activity report error:", err);
      setError(err.userMessage || err.message || "Failed to generate report");
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">DevOps Activity Report</h2>
            </div>
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            {/* Date Range Selector */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Date Range:</span>
                <TimeRangeSelector value={dateRange} onChange={setDateRange} />
              </div>
              <Button onClick={handleGenerateReport} disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Generating..." : "Generate Report"}
              </Button>
            </div>

            {/* Error Display */}
            {error && <ErrorMessage error={error} onRetry={handleGenerateReport} />}

            {/* Report Results */}
            {reportData && (
              <div className="space-y-4 mt-6">
                <PullRequestsSection data={reportData.pullRequests} />
                <PRDiscussionSection data={reportData.prDiscussion} />
                <BuildsSection data={reportData.builds} />
                <ReleasesSection data={reportData.releases} />
                <WorkItemsSection data={reportData.workItems} />

                {/* Report Metadata */}
                <div className="text-xs text-muted-foreground text-right pt-2 border-t">
                  Generated at {new Date(reportData.meta?.generatedAt).toLocaleString()}
                  {reportData.meta?.durationMs && ` • ${reportData.meta.durationMs}ms`}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
