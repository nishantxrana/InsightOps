import React, { useState, useEffect, useRef } from 'react'
import { 
  Save, 
  TestTube, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle,
  Database,
  Bot,
  Bell,
  Webhook,
  Clock,
  Shield,
  Menu
} from 'lucide-react'
import axios from 'axios'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../components/ui/select'
import { CopyButton } from '../components/ui/shadcn-io/copy-button'
import { Switch } from '../components/ui/switch'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet'
import { useToast } from '../hooks/use-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import { useHealth } from '../contexts/HealthContext'

const settingsSections = [
  { id: 'azure', name: 'Azure DevOps', icon: Database },
  { id: 'ai', name: 'AI Configuration', icon: Bot },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'webhooks', name: 'Webhook URLs', icon: Webhook },
  { id: 'polling', name: 'Polling', icon: Clock },
  { id: 'security', name: 'Security', icon: Shield }
]

export default function Settings() {
  const { toast } = useToast()
  const [activeSection, setActiveSection] = useState('azure')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showSecrets, setShowSecrets] = useState({})
  const [validationErrors, setValidationErrors] = useState({})
  const [webhookUrls, setWebhookUrls] = useState({})
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [patChanged, setPatChanged] = useState(false) // Track if PAT has been modified
  const originalProvider = useRef('')
  const { isConnected, healthData } = useHealth()
  
  const [settings, setSettings] = useState({
    azureDevOps: {
      organization: '',
      project: '',
      personalAccessToken: '',
      baseUrl: 'https://dev.azure.com'
    },
    ai: {
      provider: 'openai',
      openaiApiKey: '',
      groqApiKey: '',
      geminiApiKey: '',
      model: 'gpt-3.5-turbo'
    },
    notifications: {
      teamsWebhookUrl: '',
      slackWebhookUrl: '',
      googleChatWebhookUrl: '',
      teamsEnabled: false,
      slackEnabled: false,
      googleChatEnabled: false,
      enabled: false
    },
    polling: {
      workItemsInterval: '1',
      pullRequestInterval: '3',
      overdueCheckInterval: '4',
      workItemsEnabled: true,
      pullRequestEnabled: true,
      overdueCheckEnabled: true
    },
    security: {
      webhookSecret: '',
      apiToken: '',
      enableRateLimit: true,
      maxRequestsPerMinute: 100
    }
  })

  const validateSettings = () => {
    const errors = {}
    if (!settings.azureDevOps.organization.trim()) {
      errors.organization = 'Organization is required'
    }
    if (!settings.azureDevOps.project.trim()) {
      errors.project = 'Project is required'
    }
    if (!settings.azureDevOps.personalAccessToken.trim() && settings.azureDevOps.personalAccessToken !== '***') {
      errors.personalAccessToken = 'Personal Access Token is required'
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  useEffect(() => {
    loadSettings()
    loadWebhookUrls()
  }, [])

  useEffect(() => {
    if (settings.ai.provider && !originalProvider.current) {
      originalProvider.current = settings.ai.provider
    }
  }, [settings.ai.provider])

  useEffect(() => {
    if (settings.azureDevOps.project && projects.length === 0) {
      setProjects([{ id: 'current', name: settings.azureDevOps.project }])
    }
  }, [settings.azureDevOps.project])

  useEffect(() => {
    if (settings.ai.model && models.length === 0) {
      setModels([{ value: settings.ai.model, label: settings.ai.model, description: `Current: ${settings.ai.model}` }])
    }
  }, [settings.ai.model])

  useEffect(() => {
    if (settings.ai.provider) {
      setModels([])
      if (settings.ai.model) {
        setModels([{ value: settings.ai.model, label: settings.ai.model, description: `Current: ${settings.ai.model}` }])
      }
    }
  }, [settings.ai.provider])

  // Pre-load projects when organization is available
  useEffect(() => {
    if (settings.azureDevOps.organization && !loadingProjects && projects.length <= 1) {
      fetchProjects()
    }
  }, [settings.azureDevOps.organization])

  // Pre-load models when provider is available
  useEffect(() => {
    if (settings.ai.provider && !loadingModels && models.length <= 1) {
      fetchModels()
    }
  }, [settings.ai.provider])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/settings')
      const frontendSettings = {
        azureDevOps: {
          organization: response.data.azureDevOps?.organization || '',
          project: response.data.azureDevOps?.project || '',
          personalAccessToken: response.data.azureDevOps?.pat || '',
          baseUrl: response.data.azureDevOps?.baseUrl || 'https://dev.azure.com'
        },
        ai: {
          provider: response.data.ai?.provider || 'gemini',
          model: response.data.ai?.model || 'gemini-2.0-flash',
          openaiApiKey: response.data.ai?.apiKeys?.openai || '',
          groqApiKey: response.data.ai?.apiKeys?.groq || '',
          geminiApiKey: response.data.ai?.apiKeys?.gemini || ''
        },
        notifications: {
          enabled: response.data.notifications?.enabled !== undefined ? response.data.notifications.enabled : true,
          teamsWebhookUrl: response.data.notifications?.webhooks?.teams || '',
          slackWebhookUrl: response.data.notifications?.webhooks?.slack || '',
          googleChatWebhookUrl: response.data.notifications?.webhooks?.googleChat || '',
          teamsEnabled: response.data.notifications?.teamsEnabled !== undefined ? response.data.notifications.teamsEnabled : !!(response.data.notifications?.webhooks?.teams),
          slackEnabled: response.data.notifications?.slackEnabled !== undefined ? response.data.notifications.slackEnabled : !!(response.data.notifications?.webhooks?.slack),
          googleChatEnabled: response.data.notifications?.googleChatEnabled !== undefined ? response.data.notifications.googleChatEnabled : !!(response.data.notifications?.webhooks?.googleChat)
        },
        polling: response.data.polling || {
          workItemsInterval: '*/10 * * * *',
          pullRequestInterval: '0 */10 * * *',
          overdueCheckInterval: '0 */10 * * *',
          workItemsEnabled: true,
          pullRequestEnabled: true,
          overdueCheckEnabled: true
        },
        security: response.data.security || {
          webhookSecret: '',
          apiToken: '',
          enableRateLimit: true,
          maxRequestsPerMinute: 100
        }
      }
      setSettings(frontendSettings)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadWebhookUrls = async () => {
    try {
      const response = await axios.get('/api/webhooks/urls')
      if (response.data.success) {
        setWebhookUrls(response.data.webhookUrls)
      }
    } catch (error) {
      console.error('Failed to load webhook URLs:', error)
    }
  }

  const handleSave = async () => {
    if (!validateSettings()) {
      toast({
        title: "Validation Error",
        description: "Please fix validation errors before saving.",
        variant: "destructive",
      })
      return
    }
    try {
      setSaving(true)
      const backendSettings = {
        azureDevOps: {
          organization: settings.azureDevOps.organization,
          project: settings.azureDevOps.project,
          baseUrl: settings.azureDevOps.baseUrl
        },
        ai: {
          provider: settings.ai.provider,
          model: settings.ai.model
        },
        notifications: settings.notifications,
        polling: settings.polling,
        security: settings.security
      }
      if (settings.azureDevOps.personalAccessToken && settings.azureDevOps.personalAccessToken !== '***') {
        backendSettings.azureDevOps.pat = settings.azureDevOps.personalAccessToken;
      }
      const apiKeys = {};
      let hasApiKeys = false;
      if (settings.ai.openaiApiKey && settings.ai.openaiApiKey !== '***') {
        apiKeys.openai = settings.ai.openaiApiKey;
        hasApiKeys = true;
      }
      if (settings.ai.groqApiKey && settings.ai.groqApiKey !== '***') {
        apiKeys.groq = settings.ai.groqApiKey;
        hasApiKeys = true;
      }
      if (settings.ai.geminiApiKey && settings.ai.geminiApiKey !== '***') {
        apiKeys.gemini = settings.ai.geminiApiKey;
        hasApiKeys = true;
      }
      if (hasApiKeys) {
        backendSettings.ai.apiKeys = apiKeys;
      }
      await axios.put('/api/settings', backendSettings)
      toast({
        title: "Settings Saved",
        description: "Your settings have been saved successfully!",
      })
      setPatChanged(false) // Reset flag after successful save
    } catch (error) {
      toast({
        title: "Save Failed",
        description: `Failed to save settings: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      const testData = {
        organization: settings.azureDevOps.organization,
        project: settings.azureDevOps.project,
        pat: settings.azureDevOps.personalAccessToken,
        baseUrl: settings.azureDevOps.baseUrl
      }
      await axios.post('/api/settings/test-connection', testData)
      toast({
        title: "Connection Successful",
        description: "Azure DevOps connection test passed!",
      })
      setPatChanged(false) // Reset flag after successful test
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: `Connection test failed: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleProviderChange = (newProvider) => {
    updateSetting('ai', 'provider', newProvider)
    if (originalProvider.current && newProvider !== originalProvider.current) {
      updateSetting('ai', 'model', '')
      setModels([])
    }
  }

  const fetchModels = async () => {
    if (loadingModels || !settings.ai.provider) return
    setLoadingModels(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/ai/models/${settings.ai.provider}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const fetchedModels = response.data.models || []
      const currentModel = settings.ai.model
      if (currentModel && !fetchedModels.find(m => m.value === currentModel)) {
        fetchedModels.unshift({ value: currentModel, label: currentModel, description: `Current: ${currentModel}` })
      }
      setModels(fetchedModels)
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setLoadingModels(false)
    }
  }

  const fetchProjects = async () => {
    if (loadingProjects) return
    setLoadingProjects(true)
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const fetchedProjects = response.data.value || []
      const currentProject = settings.azureDevOps.project
      if (currentProject && !fetchedProjects.find(p => p.name === currentProject)) {
        fetchedProjects.unshift({ id: 'current', name: currentProject })
      }
      setProjects(fetchedProjects)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  const toggleSecretVisibility = (field) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const updateSetting = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
    
    // Track if PAT has been changed
    if (section === 'azureDevOps' && field === 'personalAccessToken') {
      setPatChanged(value !== '' && value !== '***')
    }
  }

  // Section Components
  function AzureDevOpsSection() {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Azure DevOps Configuration
              </CardTitle>
              <CardDescription>Configure your Azure DevOps organization and project settings</CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={handleTestConnection} 
              disabled={testing || !patChanged} 
              className="group"
            >
              <TestTube className={`h-4 w-4 mr-2 ${testing ? 'animate-pulse' : 'group-hover:scale-110'} transition-transform duration-200`} />
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                placeholder="your-organization"
                value={settings.azureDevOps.organization}
                onChange={(e) => updateSetting('azureDevOps', 'organization', e.target.value)}
              />
              {validationErrors.organization && (
                <p className="text-sm text-red-600">{validationErrors.organization}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={settings.azureDevOps.project}
                onValueChange={(value) => updateSetting('azureDevOps', 'project', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {loadingProjects && (
                      <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                    )}
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.name}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {validationErrors.project && (
                <p className="text-sm text-red-600">{validationErrors.project}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pat">Personal Access Token</Label>
            <div className="relative">
              <Input
                id="pat"
                type={showSecrets.pat ? 'text' : 'password'}
                placeholder={settings.azureDevOps.personalAccessToken === '***' ? 'Enter new PAT token or leave unchanged' : 'your-personal-access-token'}
                value={settings.azureDevOps.personalAccessToken}
                onChange={(e) => updateSetting('azureDevOps', 'personalAccessToken', e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => toggleSecretVisibility('pat')}
              >
                {showSecrets.pat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {validationErrors.personalAccessToken && (
              <p className="text-sm text-red-600">{validationErrors.personalAccessToken}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://dev.azure.com"
              value={settings.azureDevOps.baseUrl}
              onChange={(e) => updateSetting('azureDevOps', 'baseUrl', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    )
  }

  function AIConfigSection() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-600" />
            AI Configuration
          </CardTitle>
          <CardDescription>Configure your AI provider and model settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">AI Provider</Label>
            <Select
              value={settings.ai.provider}
              onValueChange={handleProviderChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select AI provider..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="groq">Groq</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          {settings.ai.provider === 'openai' && (
            <div className="space-y-2">
              <Label htmlFor="openaiKey">OpenAI API Key</Label>
              <div className="relative">
                <Input
                  id="openaiKey"
                  type={showSecrets.openai ? 'text' : 'password'}
                  placeholder="sk-..."
                  value={settings.ai.openaiApiKey}
                  onChange={(e) => updateSetting('ai', 'openaiApiKey', e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('openai')}
                >
                  {showSecrets.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {settings.ai.provider === 'groq' && (
            <div className="space-y-2">
              <Label htmlFor="groqKey">Groq API Key</Label>
              <div className="relative">
                <Input
                  id="groqKey"
                  type={showSecrets.groq ? 'text' : 'password'}
                  placeholder="gsk_..."
                  value={settings.ai.groqApiKey}
                  onChange={(e) => updateSetting('ai', 'groqApiKey', e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('groq')}
                >
                  {showSecrets.groq ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          {settings.ai.provider === 'gemini' && (
            <div className="space-y-2">
              <Label htmlFor="geminiKey">Gemini API Key</Label>
              <div className="relative">
                <Input
                  id="geminiKey"
                  type={showSecrets.gemini ? 'text' : 'password'}
                  placeholder="AIza..."
                  value={settings.ai.geminiApiKey}
                  onChange={(e) => updateSetting('ai', 'geminiApiKey', e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleSecretVisibility('gemini')}
                >
                  {showSecrets.gemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select
              value={settings.ai.model}
              onValueChange={(value) => updateSetting('ai', 'model', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {loadingModels && (
                    <SelectItem value="loading" disabled>Loading models...</SelectItem>
                  )}
                  {models.map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    )
  }

  function NotificationsSection() {
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
              checked={settings.notifications.enabled}
              onCheckedChange={(checked) => updateSetting('notifications', 'enabled', checked)}
            />
          </div>
          
          <div className={`space-y-4 p-4 border rounded-lg ${!settings.notifications.enabled ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <Label htmlFor="gchat-enabled">Google Chat</Label>
              <Switch
                id="gchat-enabled"
                checked={settings.notifications.googleChatEnabled}
                onCheckedChange={(checked) => updateSetting('notifications', 'googleChatEnabled', checked)}
                disabled={!settings.notifications.enabled}
              />
            </div>
            {settings.notifications.googleChatEnabled && (
              <Input
                placeholder="https://chat.googleapis.com/v1/spaces/..."
                value={settings.notifications.googleChatWebhookUrl}
                onChange={(e) => updateSetting('notifications', 'googleChatWebhookUrl', e.target.value)}
                disabled={!settings.notifications.enabled}
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

  function WebhooksSection() {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-orange-600" />
            Azure DevOps Webhook URLs
          </CardTitle>
          <CardDescription>
            Copy these URLs to configure webhooks in your Azure DevOps project settings. These URLs are unique to your account and will route events to your notification preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Build Completed Events</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={webhookUrls.buildCompleted || 'Loading...'}
                className="font-mono text-sm bg-muted"
              />
              <CopyButton 
                content={webhookUrls.buildCompleted}
                variant="outline"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Pull Request Created Events</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={webhookUrls.pullRequestCreated || 'Loading...'}
                className="font-mono text-sm bg-muted"
              />
              <CopyButton 
                content={webhookUrls.pullRequestCreated}
                variant="outline"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Pull Request Updated Events</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={webhookUrls.pullRequestUpdated || 'Loading...'}
                className="font-mono text-sm bg-muted"
              />
              <CopyButton 
                content={webhookUrls.pullRequestUpdated}
                variant="outline"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Work Item Created Events</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={webhookUrls.workItemCreated || 'Loading...'}
                className="font-mono text-sm bg-muted"
              />
              <CopyButton 
                content={webhookUrls.workItemCreated}
                variant="outline"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Work Item Updated Events</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={webhookUrls.workItemUpdated || 'Loading...'}
                className="font-mono text-sm bg-muted"
              />
              <CopyButton 
                content={webhookUrls.workItemUpdated}
                variant="outline"
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Setup Instructions:</h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Go to your Azure DevOps project settings</li>
              <li>Navigate to Service Hooks</li>
              <li>Create a new subscription for each event type</li>
              <li>Use the corresponding webhook URL above</li>
              <li>Events will be routed to your configured notification channels</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    )
  }

  function PollingSection() {
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
              <Label>Work Items Polling</Label>
              <Switch
                checked={settings.polling.workItemsEnabled}
                onCheckedChange={(checked) => updateSetting('polling', 'workItemsEnabled', checked)}
              />
            </div>
            <Input
              placeholder="*/15 * * * *"
              value={settings.polling.workItemsInterval}
              onChange={(e) => updateSetting('polling', 'workItemsInterval', e.target.value)}
              disabled={!settings.polling.workItemsEnabled}
            />
            <p className="text-xs text-muted-foreground mt-1">Every 15 minutes</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Pull Requests Polling</Label>
              <Switch
                checked={settings.polling.pullRequestEnabled}
                onCheckedChange={(checked) => updateSetting('polling', 'pullRequestEnabled', checked)}
              />
            </div>
            <Input
              placeholder="0 */10 * * *"
              value={settings.polling.pullRequestInterval}
              onChange={(e) => updateSetting('polling', 'pullRequestInterval', e.target.value)}
              disabled={!settings.polling.pullRequestEnabled}
            />
            <p className="text-xs text-muted-foreground mt-1">Every 10 hours</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Overdue Check Polling</Label>
              <Switch
                checked={settings.polling.overdueCheckEnabled}
                onCheckedChange={(checked) => updateSetting('polling', 'overdueCheckEnabled', checked)}
              />
            </div>
            <Input
              placeholder="0 9 * * *"
              value={settings.polling.overdueCheckInterval}
              onChange={(e) => updateSetting('polling', 'overdueCheckInterval', e.target.value)}
              disabled={!settings.polling.overdueCheckEnabled}
            />
            <p className="text-xs text-muted-foreground mt-1">Daily at 9 AM</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  function SecuritySection() {
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
              value={settings.security.webhookSecret}
              onChange={(e) => updateSetting('security', 'webhookSecret', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiToken">API Token</Label>
            <Input
              id="apiToken"
              type="password"
              placeholder="Enter API token"
              value={settings.security.apiToken}
              onChange={(e) => updateSetting('security', 'apiToken', e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="rateLimit">Enable Rate Limiting</Label>
            <Switch
              id="rateLimit"
              checked={settings.security.enableRateLimit}
              onCheckedChange={(checked) => updateSetting('security', 'enableRateLimit', checked)}
            />
          </div>
          {settings.security.enableRateLimit && (
            <div className="space-y-2">
              <Label htmlFor="maxRequests">Max Requests Per Minute</Label>
              <Input
                id="maxRequests"
                type="number"
                placeholder="100"
                value={settings.security.maxRequestsPerMinute}
                onChange={(e) => updateSetting('security', 'maxRequestsPerMinute', parseInt(e.target.value) || 100)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Add the main layout and return statement here
  const Sidebar = ({ className = "" }) => (
    <div className={`space-y-2 ${className}`}>
      {settingsSections.map((section) => {
        const Icon = section.icon
        return (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
              activeSection === section.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{section.name}</span>
          </button>
        )
      })}
    </div>
  )

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        .shimmer {
          background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.1) 50%, hsl(var(--muted)) 75%);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>

      {/* Header */}
      <div className="animate-slide-up">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="py-4">
                  <h2 className="text-lg font-semibold mb-4">Settings</h2>
                  <Sidebar />
                </div>
              </SheetContent>
            </Sheet>
            
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Configure your Azure DevOps monitoring agent</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving} className="group">
              <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-pulse' : 'group-hover:scale-110'} transition-transform duration-200`} />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 gap-6 animate-fade-in" style={{animationDelay: '0.1s'}}>
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuration</CardTitle>
              <CardDescription>Choose a section to configure</CardDescription>
            </CardHeader>
            <CardContent>
              <Sidebar />
            </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeSection === 'azure' && <AzureDevOpsSection />}
          {activeSection === 'ai' && <AIConfigSection />}
          {activeSection === 'notifications' && <NotificationsSection />}
          {activeSection === 'webhooks' && <WebhooksSection />}
          {activeSection === 'polling' && <PollingSection />}
          {activeSection === 'security' && <SecuritySection />}
        </div>
      </div>
    </div>
  )
}
