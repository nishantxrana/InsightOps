import React, { useCallback } from 'react'
import { Shield } from 'lucide-react'
import { Switch } from '../../components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

export default function SecuritySection({ data, onChange }) {
  const handleChange = useCallback((field, value) => {
    onChange({ ...data, [field]: value })
  }, [data, onChange])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-600" />
          Security Settings
        </CardTitle>
        <CardDescription>Configure security and authentication settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="webhookSecret">Webhook Secret</Label>
          <Input
            id="webhookSecret"
            type="password"
            placeholder="Enter webhook secret"
            value={data.webhookSecret}
            onChange={(e) => handleChange('webhookSecret', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apiToken">API Token</Label>
          <Input
            id="apiToken"
            type="password"
            placeholder="Enter API token"
            value={data.apiToken}
            onChange={(e) => handleChange('apiToken', e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="rateLimit">Enable Rate Limiting</Label>
          <Switch
            id="rateLimit"
            checked={data.enableRateLimit}
            onCheckedChange={(checked) => handleChange('enableRateLimit', checked)}
          />
        </div>
        {data.enableRateLimit && (
          <div className="space-y-2">
            <Label htmlFor="maxRequests">Max Requests Per Minute</Label>
            <Input
              id="maxRequests"
              type="number"
              placeholder="100"
              value={data.maxRequestsPerMinute}
              onChange={(e) => handleChange('maxRequestsPerMinute', parseInt(e.target.value) || 100)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
