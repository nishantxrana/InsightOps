import { useCallback } from "react";
import cronstrue from "cronstrue";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";
import { TagInput } from "../../components/ui/TagInput";
import { SegmentedFilter } from "@/components/kit/Toolbar";
import { StatusCallout } from "@/components/kit/StatusCallout";
import { SettingsSectionHeader } from "@/components/kit/SettingsSectionHeader";
import { SettingsPanel } from "@/components/kit/SettingsPanel";
import { SettingRow } from "@/components/kit/SettingRow";

const getCronDescription = (cronExpression) => {
  try {
    return cronstrue.toString(cronExpression);
  } catch {
    return "Invalid cron expression";
  }
};

const PR_PRESETS = [
  { label: "Every 10 minutes", value: "*/10 * * * *" },
  { label: "Every 30 minutes", value: "*/30 * * * *" },
  { label: "Every hour", value: "0 * * * *" },
];

const OVERDUE_PRESETS = [
  { label: "Every morning", value: "0 9 * * *" },
  { label: "Twice daily", value: "0 9,15 * * *" },
  { label: "Every hour", value: "0 * * * *" },
];

export default function PollingSection({ data, onChange }) {
  const handleChange = useCallback(
    (field, value) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  const handleExcludedStatesChange = useCallback(
    (next) => {
      const normalized = [];
      const seen = new Set();
      for (const s of next) {
        const t = typeof s === "string" ? s.trim() : "";
        if (!t) continue;
        const key = t.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        normalized.push(t);
      }
      handleChange("overdueExcludedStates", normalized);
    },
    [handleChange]
  );

  return (
    <div className="space-y-4">
      <SettingsSectionHeader
        title="Polling"
        description="Polling checks Azure DevOps on a schedule. Use webhooks for real-time events."
      />

      <StatusCallout tone="neutral" title="Tip">
        Polling is useful for detecting idle PRs and overdue items. For build notifications,
        webhooks are faster and recommended.
      </StatusCallout>

      <SettingsPanel
        title="Idle PR Detection"
        description="Check for pull requests with no activity"
      >
        <SettingRow
          id="idle-pr-enabled"
          htmlFor="idle-pr-enabled"
          label="Enable idle PR detection"
          description="Poll for pull requests that have gone quiet"
        >
          <div className="flex justify-end">
            <Switch
              id="idle-pr-enabled"
              checked={data.pullRequestEnabled}
              onCheckedChange={(checked) => handleChange("pullRequestEnabled", checked)}
            />
          </div>
        </SettingRow>

        {data.pullRequestEnabled ? (
          <>
            <SettingRow
              id="idle-pr-interval"
              htmlFor="idle-pr-cron"
              label="Check interval"
              description={
                data.pullRequestInterval
                  ? getCronDescription(data.pullRequestInterval)
                  : "Select a preset or enter a cron expression"
              }
              align="start"
            >
              <div className="space-y-2">
                <SegmentedFilter
                  className="h-auto max-w-full flex-wrap"
                  options={PR_PRESETS}
                  value={data.pullRequestInterval}
                  onChange={(v) => handleChange("pullRequestInterval", v)}
                />
                <Input
                  id="idle-pr-cron"
                  placeholder="*/10 * * * *"
                  value={data.pullRequestInterval}
                  onChange={(e) => handleChange("pullRequestInterval", e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </SettingRow>

            <SettingRow
              id="idle-pr-filter"
              htmlFor="idle-pr-filter-enabled"
              label="Filter old PRs"
              description="Ignore PRs created too long ago"
            >
              <div className="flex justify-end">
                <Switch
                  id="idle-pr-filter-enabled"
                  checked={data.idlePRFilterEnabled === true}
                  onCheckedChange={(checked) => handleChange("idlePRFilterEnabled", checked)}
                />
              </div>
            </SettingRow>

            {data.idlePRFilterEnabled === true ? (
              <SettingRow
                id="idle-pr-max-days"
                htmlFor="idle-pr-max-days"
                label="Ignore PRs older than"
                description="Days since creation"
              >
                <div className="flex items-center justify-end gap-2">
                  <Input
                    id="idle-pr-max-days"
                    type="number"
                    min="7"
                    max="365"
                    value={data.idlePRMaxDays ?? 90}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val) && val >= 7) handleChange("idlePRMaxDays", val);
                    }}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </SettingRow>
            ) : null}
          </>
        ) : null}
      </SettingsPanel>

      <SettingsPanel
        title="Overdue Work Item Check"
        description="Alert about work items past their target date"
      >
        <SettingRow
          id="overdue-enabled"
          htmlFor="overdue-enabled"
          label="Enable overdue check"
          description="Poll for work items past their target date"
        >
          <div className="flex justify-end">
            <Switch
              id="overdue-enabled"
              checked={data.overdueCheckEnabled}
              onCheckedChange={(checked) => handleChange("overdueCheckEnabled", checked)}
            />
          </div>
        </SettingRow>

        {data.overdueCheckEnabled ? (
          <>
            <SettingRow
              id="overdue-interval"
              htmlFor="overdue-cron"
              label="Check interval"
              description={
                data.overdueCheckInterval
                  ? getCronDescription(data.overdueCheckInterval)
                  : "Select a preset or enter a cron expression"
              }
              align="start"
            >
              <div className="space-y-2">
                <SegmentedFilter
                  className="h-auto max-w-full flex-wrap"
                  options={OVERDUE_PRESETS}
                  value={data.overdueCheckInterval}
                  onChange={(v) => handleChange("overdueCheckInterval", v)}
                />
                <Input
                  id="overdue-cron"
                  placeholder="0 9 * * *"
                  value={data.overdueCheckInterval}
                  onChange={(e) => handleChange("overdueCheckInterval", e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </SettingRow>

            <SettingRow
              id="overdue-filter"
              htmlFor="overdue-filter-enabled"
              label="Filter old items"
              description="Ignore items overdue for too long"
            >
              <div className="flex justify-end">
                <Switch
                  id="overdue-filter-enabled"
                  checked={data.overdueFilterEnabled === true}
                  onCheckedChange={(checked) => handleChange("overdueFilterEnabled", checked)}
                />
              </div>
            </SettingRow>

            {data.overdueFilterEnabled === true ? (
              <SettingRow
                id="overdue-max-days"
                htmlFor="overdue-max-days"
                label="Ignore items overdue more than"
                description="Days past target date"
              >
                <div className="flex items-center justify-end gap-2">
                  <Input
                    id="overdue-max-days"
                    type="number"
                    min="1"
                    max="365"
                    value={data.overdueMaxDays ?? 60}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!Number.isNaN(val) && val >= 1) handleChange("overdueMaxDays", val);
                    }}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </SettingRow>
            ) : null}

            <SettingRow
              id="overdue-state-filter"
              htmlFor="overdue-state-filter-enabled"
              label="Filter by state"
              description="When off, saved state names stay below but are not applied to overdue alerts."
            >
              <div className="flex justify-end">
                <Switch
                  id="overdue-state-filter-enabled"
                  checked={data.overdueExcludedStatesEnabled === true}
                  onCheckedChange={(checked) =>
                    handleChange("overdueExcludedStatesEnabled", checked)
                  }
                />
              </div>
            </SettingRow>

            <SettingRow
              id="overdue-excluded-states"
              label="Exclude states"
              description={
                <>
                  Items whose{" "}
                  <code className="rounded bg-muted px-1 font-mono text-xs">System.State</code>{" "}
                  matches any value below (exact name, case-insensitive) are skipped from overdue
                  polling alerts only.
                </>
              }
              align="start"
            >
              <div
                className={
                  data.overdueExcludedStatesEnabled !== true
                    ? "pointer-events-none select-none opacity-60"
                    : undefined
                }
                aria-disabled={data.overdueExcludedStatesEnabled !== true}
              >
                <TagInput
                  value={
                    Array.isArray(data.overdueExcludedStates) ? data.overdueExcludedStates : []
                  }
                  onChange={handleExcludedStatesChange}
                  placeholder="e.g. Resolved"
                  dedupeCaseInsensitive
                />
              </div>
              {data.overdueExcludedStatesEnabled !== true ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Turn &quot;Filter by state&quot; on to edit keywords or to exclude these states
                  from alerts.
                </p>
              ) : null}
            </SettingRow>
          </>
        ) : null}
      </SettingsPanel>

      <p className="text-xs text-muted-foreground">All times are in server timezone (UTC).</p>
    </div>
  );
}
