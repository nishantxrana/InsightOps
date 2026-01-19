import React, { useCallback } from 'react'
import { Bell } from 'lucide-react'
import { Switch } from '../../components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

export default function NotificationsSection({ data, onChange }) {
  const handleChange = useCallback((field, value) => {
    onChange({ ...data, [field]: value })
  }, [data, onChange])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-green-600" />
          Notifications
        </CardTitle>
        <CardDescription>Configure notification settings for Azure DevOps events</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="notifications-enabled">Enable notifications</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Get notified about build failures, idle PRs, and overdue work items
            </p>
          </div>
          <Switch
            id="notifications-enabled"
            checked={data.enabled}
            onCheckedChange={(checked) => handleChange('enabled', checked)}
          />
        </div>
        
        <div className={`space-y-4 p-4 border rounded-lg ${!data.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="gchat-enabled">Google Chat</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Send notifications to a Google Chat space</p>
            </div>
            <Switch
              id="gchat-enabled"
              checked={data.googleChatEnabled}
              onCheckedChange={(checked) => handleChange('googleChatEnabled', checked)}
              disabled={!data.enabled}
            />
          </div>
          {data.googleChatEnabled && (
            <div className="space-y-2">
              <Input
                placeholder="https://chat.googleapis.com/v1/spaces/..."
                value={data.googleChatWebhookUrl}
                onChange={(e) => handleChange('googleChatWebhookUrl', e.target.value)}
                disabled={!data.enabled}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                <a 
                  href="https://developers.google.com/chat/how-tos/webhooks" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  How to create a webhook →
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Collapsed Coming Soon section */}
        <details className="group">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            More integrations coming soon...
          </summary>
          <div className="mt-3 space-y-3 opacity-50">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label className="text-muted-foreground">Microsoft Teams</Label>
              <Switch disabled />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label className="text-muted-foreground">Slack</Label>
              <Switch disabled />
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
