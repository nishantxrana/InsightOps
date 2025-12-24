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
        <CardDescription>Configure how often to check for updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Pull Requests Polling</Label>
            <Switch
              checked={data.pullRequestEnabled}
              onCheckedChange={(checked) => handleChange('pullRequestEnabled', checked)}
            />
          </div>
          <Input
            placeholder="0 */10 * * *"
            value={data.pullRequestInterval}
            onChange={(e) => handleChange('pullRequestInterval', e.target.value)}
            disabled={!data.pullRequestEnabled}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {data.pullRequestInterval ? getCronDescription(data.pullRequestInterval) : 'Enter cron expression'}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Overdue Check Polling</Label>
            <Switch
              checked={data.overdueCheckEnabled}
              onCheckedChange={(checked) => handleChange('overdueCheckEnabled', checked)}
            />
          </div>
          <Input
            placeholder="0 9 * * *"
            value={data.overdueCheckInterval}
            onChange={(e) => handleChange('overdueCheckInterval', e.target.value)}
            disabled={!data.overdueCheckEnabled}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {data.overdueCheckInterval ? getCronDescription(data.overdueCheckInterval) : 'Enter cron expression'}
          </p>
          
          <div className="mt-4 space-y-3 p-3 border rounded-md bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Limit to Recent Overdue Items</Label>
                <p className="text-xs text-muted-foreground">Only show items overdue within a specific timeframe</p>
              </div>
              <Switch
                checked={data.overdueFilterEnabled !== false}
                onCheckedChange={(checked) => handleChange('overdueFilterEnabled', checked)}
                disabled={!data.overdueCheckEnabled}
              />
            </div>
            
            {data.overdueFilterEnabled !== false && (
              <div>
                <Label className="text-sm">Maximum Days Overdue</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={data.overdueMaxDays ?? 60}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val) && val >= 1) handleChange('overdueMaxDays', val)
                  }}
                  disabled={!data.overdueCheckEnabled}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only notify about items overdue within the last {data.overdueMaxDays ?? 60} days
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
