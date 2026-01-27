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
      const response = await apiService.generateActivityReport(
        dateRange.from.toISOString(),
        dateRange.to.toISOString()
      );

      if (response.success) {
        setReportData(response.data);
      } else {
        setError(response.error || "Failed to generate report");
      }
    } catch (err) {
      setError(err.message || "Failed to generate report");
    } finally {
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
