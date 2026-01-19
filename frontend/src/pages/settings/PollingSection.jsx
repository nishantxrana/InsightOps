import React, { useCallback } from 'react'
import cronstrue from 'cronstrue'
import { Clock } from 'lucide-react'
import { Switch } from '../../components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

const getCronDescription = (cronExpression) => {
  try {
    return cronstrue.toString(cronExpression)
  } catch (error) {
    return 'Invalid cron expression'
  }
}

// Common polling presets
const PRESETS = {
  pullRequest: [
    { label: 'Every 10 minutes', value: '*/10 * * * *' },
    { label: 'Every 30 minutes', value: '*/30 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
  ],
  overdue: [
    { label: 'Every morning (9 AM)', value: '0 9 * * *' },
    { label: 'Twice daily (9 AM, 3 PM)', value: '0 9,15 * * *' },
    { label: 'Every hour', value: '0 * * * *' },
  ]
}

export default function PollingSection({ data, onChange }) {
  const handleChange = useCallback((field, value) => {
    onChange({ ...data, [field]: value })
  }, [data, onChange])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Polling Intervals
        </CardTitle>
        <CardDescription>
          Polling checks Azure DevOps on a schedule. Use webhooks for real-time events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info callout */}
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Tip:</strong> Polling is useful for detecting idle PRs and overdue items. For build notifications, webhooks are faster and recommended.
          </p>
        </div>

        {/* Pull Requests Polling */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Idle PR Detection</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Check for pull requests with no activity</p>
            </div>
            <Switch
              checked={data.pullRequestEnabled}
              onCheckedChange={(checked) => handleChange('pullRequestEnabled', checked)}
            />
          </div>
          
          {data.pullRequestEnabled && (
            <div className="space-y-2 pl-0">
              <div className="flex gap-2 flex-wrap">
                {PRESETS.pullRequest.map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleChange('pullRequestInterval', preset.value)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      data.pullRequestInterval === preset.value 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-muted hover:bg-muted/80 border-transparent'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <Input
                placeholder="*/10 * * * *"
                value={data.pullRequestInterval}
                onChange={(e) => handleChange('pullRequestInterval', e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {data.pullRequestInterval ? getCronDescription(data.pullRequestInterval) : 'Select a preset or enter a cron expression'}
              </p>
            </div>
          )}
        </div>

        {/* Overdue Check Polling */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Overdue Work Item Check</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Alert about work items past their target date</p>
            </div>
            <Switch
              checked={data.overdueCheckEnabled}
              onCheckedChange={(checked) => handleChange('overdueCheckEnabled', checked)}
            />
          </div>
          
          {data.overdueCheckEnabled && (
            <div className="space-y-3 pl-0">
              <div className="flex gap-2 flex-wrap">
                {PRESETS.overdue.map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleChange('overdueCheckInterval', preset.value)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      data.overdueCheckInterval === preset.value 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-muted hover:bg-muted/80 border-transparent'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <Input
                placeholder="0 9 * * *"
                value={data.overdueCheckInterval}
                onChange={(e) => handleChange('overdueCheckInterval', e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {data.overdueCheckInterval ? getCronDescription(data.overdueCheckInterval) : 'Select a preset or enter a cron expression'}
              </p>
              
              {/* Overdue filter options */}
              <div className="mt-2 space-y-3 p-3 border rounded-md bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Filter Old Items</Label>
                    <p className="text-xs text-muted-foreground">Ignore items overdue for too long</p>
                  </div>
                  <Switch
                    checked={data.overdueFilterEnabled !== false}
                    onCheckedChange={(checked) => handleChange('overdueFilterEnabled', checked)}
                  />
                </div>
                
                {data.overdueFilterEnabled !== false && (
                  <div>
                    <Label className="text-sm">Ignore items overdue for more than</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={data.overdueMaxDays ?? 60}
                        onChange={(e) => {
                          const val = parseInt(e.target.value)
                          if (!isNaN(val) && val >= 1) handleChange('overdueMaxDays', val)
                        }}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          All times are in server timezone (UTC).
        </p>
      </CardContent>
    </Card>
  )
}
