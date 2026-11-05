import { useEffect, useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Check, Copy, ExternalLink, Rocket } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { releaseService } from "../api/releaseService";
import { buildReleaseUrl } from "../utils/azureDevOpsUrls";
import { DetailSheet } from "@/components/kit/DetailSheet";
import { KeyValueList } from "@/components/kit/KeyValueList";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { StatusCallout } from "@/components/kit/StatusCallout";
import { releaseStatus } from "@/components/kit/statusMaps";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReleaseApprovalsTab } from "./releases/ReleaseApprovalsTab";
import { ReleasePipelineStrip } from "./releases/ReleasePipelineStrip";
import { ReleaseTaskLogsTab } from "./releases/ReleaseTaskLogsTab";
import {
  envCounts,
  getDefaultTab,
  isFailedRelease,
  isInProgressRelease,
  isSucceededRelease,
  isWaitingForApproval,
} from "./releases/releaseDetailHelpers";

/**
 * DetailSheet for a release. Keeps releaseService / Auth / ADO URL contracts.
 */
export default function ReleaseDetailModal({
  release,
  isOpen,
  onClose,
  list = [],
  onNavigate,
  triggerRef,
}) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [approvals, setApprovals] = useState(null);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [approvalsError, setApprovalsError] = useState(null);
  const [failedLogs, setFailedLogs] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState("approvals");

  const failed = isFailedRelease(release);
  const waiting = isWaitingForApproval(release);
  const succeeded = isSucceededRelease(release);
  const inProgress = isInProgressRelease(release);
  const { failedEnvCount, succeededEnvCount, totalEnvCount } = envCounts(release);

  const listIndex = useMemo(() => {
    if (!release || !list.length) return -1;
    return list.findIndex((r) => r.id === release.id);
  }, [list, release]);

  const hasPrev = listIndex > 0;
  const hasNext = listIndex >= 0 && listIndex < list.length - 1;

  const getReleaseUrl = () => {
    if (!release) return "#";
    const organization = user?.organization || release.organization;
    const project = user?.project || release.project;
    return buildReleaseUrl(organization, project, release.id);
  };

  const loadFailedTaskLogs = async () => {
    if (!release?.id) return;
    try {
      setLoadingLogs(true);
      setLogsError(null);
      const response = await releaseService.getReleaseTaskLogs(release.id);
      if (response.success) {
        setFailedLogs(response.data);
      } else {
        setLogsError("Failed to load task logs");
      }
    } catch (error) {
      setLogsError(error.userMessage || "Failed to load task logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadApprovals = async () => {
    if (!release?.id) return;
    try {
      setLoadingApprovals(true);
      setApprovalsError(null);
      const response = await releaseService.getReleaseApprovals(release.id);
      if (response.success) {
        setApprovals(response.data);
      } else {
        setApprovals(null);
        setApprovalsError("Failed to load approvals");
      }
    } catch (error) {
      setApprovals(null);
      setApprovalsError(error.userMessage || "Failed to load approvals");
    } finally {
      setLoadingApprovals(false);
    }
  };

  const loadAIAnalysis = async () => {
    if (!release?.id || loadingAI) return;
    try {
      setLoadingAI(true);
      setAiError(null);
      const response = await releaseService.analyzeRelease(release.id);
      if (response.success) {
        setAiAnalysis(response.analysis);
      } else {
        setAiAnalysis(null);
        setAiError("AI analysis temporarily unavailable.");
      }
    } catch (error) {
      setAiAnalysis(null);
      setAiError(error.userMessage || "AI analysis temporarily unavailable.");
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    if (isOpen && release?.id) {
      const tab = getDefaultTab(release);
      setActiveTab(tab);
      setAiAnalysis(null);
      setAiError(null);
      setLoadingAI(false);
      setCopied(false);
      if (isFailedRelease(release)) {
        loadFailedTaskLogs();
      } else {
        setFailedLogs(null);
        setLogsError(null);
      }
      loadApprovals();
    } else if (!isOpen) {
      setFailedLogs(null);
      setLogsError(null);
      setLoadingLogs(false);
      setApprovals(null);
      setApprovalsError(null);
      setLoadingApprovals(false);
      setAiAnalysis(null);
      setAiError(null);
      setLoadingAI(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key off id + open
  }, [isOpen, release?.id]);

  const copyLink = async () => {
    const url = getReleaseUrl();
    if (url === "#") return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable
    }
  };

  const callout = useMemo(() => {
    if (!release) return null;
    if (failed) {
      return {
        tone: "danger",
        title: "Deployment Failed",
        children:
          failedEnvCount > 0
            ? `${failedEnvCount} environment${failedEnvCount > 1 ? "s" : ""} failed`
            : "Review logs and failure analysis below",
      };
    }
    if (waiting) {
      return {
        tone: "warning",
        title: "Waiting for Approval",
        children: "Action required to continue deployment",
      };
    }
    if (succeeded) {
      return {
        tone: "success",
        title: "Deployment Succeeded",
        children:
          totalEnvCount > 0
            ? `All ${totalEnvCount} environment${totalEnvCount > 1 ? "s" : ""} deployed`
            : undefined,
      };
    }
    if (inProgress) {
      return { tone: "info", title: "Deployment In Progress" };
    }
    return null;
  }, [release, failed, waiting, succeeded, inProgress, failedEnvCount, totalEnvCount]);

  if (!release) return null;

  const adoLabel = failed
    ? "View Logs in Azure DevOps"
    : waiting
      ? "Approve in Azure DevOps"
      : "Open in Azure DevOps";

  return (
    <DetailSheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      triggerRef={triggerRef}
      icon={<Rocket />}
      title={release.name || "Release"}
      subtitle={
        <span className="font-mono tabular-nums">
          #{release.id}
          {totalEnvCount > 0 ? (
            <span className="ml-2 font-sans text-muted-foreground">
              {succeededEnvCount}/{totalEnvCount} envs
            </span>
          ) : null}
        </span>
      }
      description={`Release ${release.id}`}
      status={<StatusBadge {...releaseStatus(release)} />}
      onPrev={hasPrev ? () => onNavigate?.(listIndex - 1) : undefined}
      onNext={hasNext ? () => onNavigate?.(listIndex + 1) : undefined}
      hasPrev={hasPrev}
      hasNext={hasNext}
      headerActions={
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={copyLink}
            aria-label={copied ? "Copied" : "Copy link"}
          >
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="size-8" asChild>
            <a
              href={getReleaseUrl()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in Azure DevOps"
            >
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </>
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copyLink}>
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button asChild>
            <a href={getReleaseUrl()} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" aria-hidden="true" />
              {adoLabel}
            </a>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {callout ? (
          <StatusCallout tone={callout.tone} title={callout.title}>
            {callout.children}
          </StatusCallout>
        ) : null}

        <KeyValueList
          columns={4}
          items={[
            { label: "Created By", value: release.createdBy?.displayName || "Unknown" },
            {
              label: "Created",
              value: release.createdOn
                ? formatDistanceToNow(new Date(release.createdOn), { addSuffix: true })
                : "Unknown",
            },
            { label: "Pipeline", value: release.definitionName || "Unknown" },
            {
              label: "Environments",
              value:
                failedEnvCount > 0
                  ? `${succeededEnvCount}/${totalEnvCount} · ${failedEnvCount} failed`
                  : `${succeededEnvCount}/${totalEnvCount} deployed`,
            },
          ]}
        />

        {release.createdOn ? (
          <p className="text-[11px] text-muted-foreground">
            {format(new Date(release.createdOn), "PPpp")}
          </p>
        ) : null}

        <ReleasePipelineStrip environments={release.environments} />

        {release.description ? (
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-foreground">Description</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {release.description}
            </p>
          </section>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {failed ? <TabsTrigger value="logs">Task Logs</TabsTrigger> : null}
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
          </TabsList>
          {failed ? (
            <TabsContent value="logs">
              <ReleaseTaskLogsTab
                failedLogs={failedLogs}
                loadingLogs={loadingLogs}
                logsError={logsError}
                onRefresh={loadFailedTaskLogs}
                aiAnalysis={aiAnalysis}
                aiError={aiError}
                loadingAI={loadingAI}
                onDiagnose={loadAIAnalysis}
              />
            </TabsContent>
          ) : null}
          <TabsContent value="approvals">
            <ReleaseApprovalsTab
              release={release}
              approvals={approvals}
              loadingApprovals={loadingApprovals}
              approvalsError={approvalsError}
              onRefresh={loadApprovals}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DetailSheet>
  );
}
