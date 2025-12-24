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
          <Label htmlFor="notifications-enabled">Enable notifications</Label>
          <Switch
            id="notifications-enabled"
            checked={data.enabled}
            onCheckedChange={(checked) => handleChange('enabled', checked)}
          />
        </div>
        
        <div className={`space-y-4 p-4 border rounded-lg ${!data.enabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center justify-between">
            <Label htmlFor="gchat-enabled">Google Chat</Label>
            <Switch
              id="gchat-enabled"
              checked={data.googleChatEnabled}
              onCheckedChange={(checked) => handleChange('googleChatEnabled', checked)}
              disabled={!data.enabled}
            />
          </div>
          {data.googleChatEnabled && (
            <Input
              placeholder="https://chat.googleapis.com/v1/spaces/..."
              value={data.googleChatWebhookUrl}
              onChange={(e) => handleChange('googleChatWebhookUrl', e.target.value)}
              disabled={!data.enabled}
            />
          )}
        </div>

        <div className="space-y-4 p-4 border rounded-lg opacity-50">
          <div className="flex items-center justify-between">
            <Label>Microsoft Teams (Coming Soon)</Label>
            <Switch disabled />
          </div>
        </div>

        <div className="space-y-4 p-4 border rounded-lg opacity-50">
          <div className="flex items-center justify-between">
            <Label>Slack (Coming Soon)</Label>
            <Switch disabled />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
