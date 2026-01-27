import React, { useState, useEffect } from 'react'
import { Webhook, Building2 } from 'lucide-react'
import axios from 'axios'
import { CopyButton } from '../../components/ui/shadcn-io/copy-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'

export default function WebhooksSection() {
  const [webhookUrls, setWebhookUrls] = useState({})
  const [organizationName, setOrganizationName] = useState('')

  useEffect(() => {
    const loadWebhookUrls = async () => {
      try {
        const token = localStorage.getItem('token')
        const currentOrgId = localStorage.getItem('currentOrganizationId')
        const headers = { Authorization: `Bearer ${token}` }
        if (currentOrgId) headers['X-Organization-ID'] = currentOrgId
        
        const response = await axios.get('/api/webhooks/urls', { headers })
        if (response.data.success) {
          setWebhookUrls(response.data.webhookUrls)
          setOrganizationName(response.data.organizationName || '')
        }
      } catch {
        // Webhook URLs are non-critical on initial load
      }
    }
    loadWebhookUrls()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-orange-600" />
              Azure DevOps Webhook URLs
            </CardTitle>
            <CardDescription>
              Copy these URLs to configure webhooks in your Azure DevOps project settings.
            </CardDescription>
          </div>
          {organizationName && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {organizationName}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instructions first for visibility */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Quick Setup:</h4>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside mb-3">
            <li>Copy a webhook URL below</li>
            <li>Go to Azure DevOps → Project Settings → Service Hooks</li>
            <li>Create a new "Web Hooks" subscription</li>
            <li>Select the event type and paste the URL</li>
          </ol>
          <a 
            href="https://dev.azure.com/_settings/serviceHooks" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-700 dark:text-blue-300 hover:underline font-medium"
          >
            Open Azure DevOps Service Hooks →
          </a>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Build Completed</Label>
            <p className="text-xs text-muted-foreground mb-2">Triggers when a build pipeline finishes (success or failure)</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={webhookUrls.buildCompleted || 'Loading...'} className="font-mono text-xs bg-muted" />
              <CopyButton content={webhookUrls.buildCompleted} variant="outline" />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Pull Request Created</Label>
            <p className="text-xs text-muted-foreground mb-2">Triggers when a new pull request is opened</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={webhookUrls.pullRequestCreated || 'Loading...'} className="font-mono text-xs bg-muted" />
              <CopyButton content={webhookUrls.pullRequestCreated} variant="outline" />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Work Item Created</Label>
            <p className="text-xs text-muted-foreground mb-2">Triggers when a bug, task, or user story is created</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={webhookUrls.workItemCreated || 'Loading...'} className="font-mono text-xs bg-muted" />
              <CopyButton content={webhookUrls.workItemCreated} variant="outline" />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Work Item Updated</Label>
            <p className="text-xs text-muted-foreground mb-2">Triggers when a work item's state or fields change</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={webhookUrls.workItemUpdated || 'Loading...'} className="font-mono text-xs bg-muted" />
              <CopyButton content={webhookUrls.workItemUpdated} variant="outline" />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">Release Deployment</Label>
            <p className="text-xs text-muted-foreground mb-2">Triggers when a release deployment completes</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={webhookUrls.releaseDeployment || 'Loading...'} className="font-mono text-xs bg-muted" />
              <CopyButton content={webhookUrls.releaseDeployment} variant="outline" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
