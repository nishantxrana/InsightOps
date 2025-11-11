import React, { useState, useEffect } from 'react'
import { 
  Save, 
  TestTube, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  Settings as SettingsIcon,
  Bell,
  Zap,
  Clock,
  Shield,
  Database,
  Webhook,
  Bot
} from 'lucide-react'
import axios from 'axios'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import LoadingSpinner from '../components/LoadingSpinner'
import { useHealth } from '../contexts/HealthContext'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showSecrets, setShowSecrets] = useState({})
  const [testResult, setTestResult] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [webhookUrls, setWebhookUrls] = useState({})
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)
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
    
    // Azure DevOps validation (required)
    if (!settings.azureDevOps.organization.trim()) {
      errors.organization = 'Organization is required'
    }
    if (!settings.azureDevOps.project.trim()) {
      errors.project = 'Project is required'
    }
    // PAT is valid if it exists OR is masked (meaning it was previously saved)
    if (!settings.azureDevOps.personalAccessToken.trim() && settings.azureDevOps.personalAccessToken !== '***') {
      errors.personalAccessToken = 'Personal Access Token is required'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const tabs = [
    { id: 'azure', name: 'Azure DevOps', icon: Database },
    { id: 'ai', name: 'AI Configuration', icon: Bot },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'webhooks', name: 'Webhook URLs', icon: Webhook },
    { id: 'polling', name: 'Polling', icon: Clock },
    { id: 'security', name: 'Security', icon: Shield }
  ]

  useEffect(() => {
    loadSettings()
    loadWebhookUrls()
  }, [])

  useEffect(() => {
    // Initialize projects with current saved project when settings load
    if (settings.azureDevOps.project && projects.length === 0) {
      setProjects([{ id: 'current', name: settings.azureDevOps.project }])
    }
  }, [settings.azureDevOps.project])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/settings')
      
      // Map backend field names to frontend field names
      // Map backend field names to frontend field names
      const frontendSettings = {
        azureDevOps: {
          organization: response.data.azureDevOps?.organization || '',
          project: response.data.azureDevOps?.project || '',
          personalAccessToken: response.data.azureDevOps?.pat || '', // Map pat to personalAccessToken
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
          enabled: response.data.notifications?.enabled !== undefined 
            ? response.data.notifications.enabled 
            : true,
          teamsWebhookUrl: response.data.notifications?.webhooks?.teams || '',
          slackWebhookUrl: response.data.notifications?.webhooks?.slack || '',
          googleChatWebhookUrl: response.data.notifications?.webhooks?.googleChat || '',
          // Auto-enable checkboxes if webhook URLs exist, otherwise use saved state
          teamsEnabled: response.data.notifications?.teamsEnabled !== undefined 
            ? response.data.notifications.teamsEnabled 
            : !!(response.data.notifications?.webhooks?.teams),
          slackEnabled: response.data.notifications?.slackEnabled !== undefined 
            ? response.data.notifications.slackEnabled 
            : !!(response.data.notifications?.webhooks?.slack),
          googleChatEnabled: response.data.notifications?.googleChatEnabled !== undefined 
            ? response.data.notifications.googleChatEnabled 
            : !!(response.data.notifications?.webhooks?.googleChat)
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

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const handleSave = async () => {
    if (!validateSettings()) {
      setTestResult({ success: false, message: 'Please fix validation errors before saving.' })
      return
    }
    
    try {
      setSaving(true)
      
      // Map frontend field names to backend field names
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
      
      // Only include PAT if it's not masked
      if (settings.azureDevOps.personalAccessToken && settings.azureDevOps.personalAccessToken !== '***') {
        backendSettings.azureDevOps.pat = settings.azureDevOps.personalAccessToken;
      }
      
      // Only include API keys if they're not masked
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
      
      // Only include apiKeys if we have at least one key to update
      if (hasApiKeys) {
        backendSettings.ai.apiKeys = apiKeys;
      }
      
      await axios.put('/api/settings', backendSettings)
      setTestResult({ success: true, message: 'Settings saved successfully!' })
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to save settings: ' + error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      
      // Map frontend field names to backend field names for test
      const testData = {
        organization: settings.azureDevOps.organization,
        project: settings.azureDevOps.project,
        pat: settings.azureDevOps.personalAccessToken, // Map personalAccessToken to pat
        baseUrl: settings.azureDevOps.baseUrl
      }
      
      await axios.post('/api/settings/test-connection', testData)
      setTestResult({ success: true, message: 'Connection test successful!' })
    } catch (error) {
      setTestResult({ success: false, message: 'Connection test failed: ' + error.message })
    } finally {
      setTesting(false)
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
      
      // Ensure current project is in the list
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
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
      
      {/* Header */}
      <div className="animate-slide-up">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Configure your Azure DevOps monitoring agent</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 disabled:opacity-50 transition-colors"
            >
              <TestTube className="h-4 w-4" />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`bg-card dark:bg-[#111111] p-4 rounded-2xl border shadow-sm flex items-center gap-3 animate-fade-in ${
          testResult.success 
            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50' 
            : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50'
        }`} style={{animationDelay: '0.1s'}}>
          {testResult.success ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
          <span className={testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
            {testResult.message}
          </span>
        </div>
      )}

      <Tabs defaultValue="azure" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="azure" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Azure DevOps
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Config
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="polling" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Polling
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="azure" className="mt-6">
        <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Azure DevOps Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Organization</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                value={settings.azureDevOps.organization}
                onChange={(e) => updateSetting('azureDevOps', 'organization', e.target.value)}
                placeholder="your-organization"
              />
              {validationErrors.organization && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.organization}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Project</label>
              <Select
                value={settings.azureDevOps.project}
                onValueChange={(value) => updateSetting('azureDevOps', 'project', value)}
                onOpenChange={(open) => open && fetchProjects()}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingProjects && (
                    <SelectItem value="loading" disabled>Loading projects...</SelectItem>
                  )}
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.name}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.project && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.project}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Personal Access Token</label>
              <div className="relative">
                <input
                  type={showSecrets.pat ? 'text' : 'password'}
                  className="w-full px-3 py-2 pr-10 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                  value={settings.azureDevOps.personalAccessToken}
                  onChange={(e) => updateSetting('azureDevOps', 'personalAccessToken', e.target.value)}
                  placeholder={settings.azureDevOps.personalAccessToken === '***' ? 'Enter new PAT token or leave unchanged' : 'your-personal-access-token'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-muted-foreground transition-colors"
                  onClick={() => toggleSecretVisibility('pat')}
                >
                  {showSecrets.pat ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
              {validationErrors.personalAccessToken && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.personalAccessToken}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Base URL</label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                value={settings.azureDevOps.baseUrl}
                onChange={(e) => updateSetting('azureDevOps', 'baseUrl', e.target.value)}
                placeholder="https://dev.azure.com"
              />
            </div>
          </div>
        </div>
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
        <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
          <h3 className="text-lg font-medium text-foreground mb-4">AI Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">AI Provider</label>
              <select
                className="w-full px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground"
                value={settings.ai.provider}
                onChange={(e) => updateSetting('ai', 'provider', e.target.value)}
              >
                <option value="openai">OpenAI</option>
                <option value="groq">Groq</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
            {settings.ai.provider === 'openai' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">OpenAI API Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.openai ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                    value={settings.ai.openaiApiKey}
                    onChange={(e) => updateSetting('ai', 'openaiApiKey', e.target.value)}
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => toggleSecretVisibility('openai')}
                  >
                    {showSecrets.openai ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {settings.ai.provider === 'groq' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Groq API Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.groq ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                    value={settings.ai.groqApiKey}
                    onChange={(e) => updateSetting('ai', 'groqApiKey', e.target.value)}
                    placeholder="gsk_..."
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => toggleSecretVisibility('groq')}
                  >
                    {showSecrets.groq ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {settings.ai.provider === 'gemini' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.gemini ? 'text' : 'password'}
                    className="w-full px-3 py-2 pr-10 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                    value={settings.ai.geminiApiKey}
                    onChange={(e) => updateSetting('ai', 'geminiApiKey', e.target.value)}
                    placeholder="AIza..."
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => toggleSecretVisibility('gemini')}
                  >
                    {showSecrets.gemini ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Model</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                value={settings.ai.model}
                onChange={(e) => updateSetting('ai', 'model', e.target.value)}
                placeholder="gpt-3.5-turbo"
              />
            </div>
          </div>
        </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
        <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
          <h3 className="text-lg font-medium text-foreground mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="notifications-enabled" className="text-sm font-medium text-foreground">
                Enable notifications
              </label>
              <Switch
                id="notifications-enabled"
                checked={settings.notifications.enabled}
                onCheckedChange={(checked) => updateSetting('notifications', 'enabled', checked)}
              />
            </div>
            
            {/* Microsoft Teams */}
            <div className="border border-border dark:border-[#1a1a1a] rounded-lg p-4 opacity-50">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="teams-enabled" className="text-sm font-medium text-foreground">
                  Microsoft Teams (Coming Soon)
                </label>
                <Switch
                  id="teams-enabled"
                  checked={settings.notifications.teamsEnabled}
                  onCheckedChange={(checked) => updateSetting('notifications', 'teamsEnabled', checked)}
                  disabled={true}
                />
              </div>
              <input
                type="url"
                className="w-full px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground opacity-50"
                value={settings.notifications.teamsWebhookUrl}
                onChange={(e) => updateSetting('notifications', 'teamsWebhookUrl', e.target.value)}
                placeholder="https://outlook.office.com/webhook/..."
                disabled={true}
              />
            </div>

            {/* Slack */}
            <div className="border border-border dark:border-[#1a1a1a] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="slack-enabled" className="text-sm font-medium text-foreground">
                  Slack (Coming Soon)
                </label>
                <Switch
                  id="slack-enabled"
                  checked={settings.notifications.slackEnabled}
                  onCheckedChange={(checked) => updateSetting('notifications', 'slackEnabled', checked)}
                  disabled={true}
                />
              </div>
              <input
                type="url"
                className="w-full px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                value={settings.notifications.slackWebhookUrl}
                onChange={(e) => updateSetting('notifications', 'slackWebhookUrl', e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                disabled={!settings.notifications.slackEnabled}
              />
            </div>

            {/* Google Chat */}
            <div className={`border border-border dark:border-[#1a1a1a] rounded-lg p-4 ${!settings.notifications.enabled ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="gchat-enabled" className="text-sm font-medium text-foreground">
                  Google Chat
                </label>
                <Switch
                  id="gchat-enabled"
                  checked={settings.notifications.googleChatEnabled}
                  onCheckedChange={(checked) => updateSetting('notifications', 'googleChatEnabled', checked)}
                  disabled={!settings.notifications.enabled}
                />
              </div>
              <input
                type="url"
                className="w-full px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                value={settings.notifications.googleChatWebhookUrl}
                onChange={(e) => updateSetting('notifications', 'googleChatWebhookUrl', e.target.value)}
                placeholder="https://chat.googleapis.com/v1/spaces/..."
                disabled={!settings.notifications.enabled || !settings.notifications.googleChatEnabled}
              />
            </div>
          </div>
        </div>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
            <h3 className="text-lg font-medium text-foreground mb-4">Azure DevOps Webhook URLs</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Copy these URLs to configure webhooks in your Azure DevOps project settings. These URLs are unique to your account and will route events to your notification preferences.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Build Completed Events</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrls.buildCompleted || 'Loading...'}
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookUrls.buildCompleted)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Pull Request Created Events</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrls.pullRequestCreated || 'Loading...'}
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookUrls.pullRequestCreated)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Pull Request Updated Events</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrls.pullRequestUpdated || 'Loading...'}
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookUrls.pullRequestUpdated)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Work Item Created Events</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrls.workItemCreated || 'Loading...'}
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookUrls.workItemCreated)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Work Item Updated Events</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrls.workItemUpdated || 'Loading...'}
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={() => copyToClipboard(webhookUrls.workItemUpdated)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
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
          </div>
        </TabsContent>

        <TabsContent value="polling" className="mt-6">
        <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
          <h3 className="text-lg font-medium text-foreground mb-4">Polling Intervals</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Work Items Polling</label>
                <Switch
                  checked={settings.polling.workItemsEnabled}
                  onCheckedChange={(checked) => updateSetting('polling', 'workItemsEnabled', checked)}
                />
              </div>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                value={settings.polling.workItemsInterval}
                onChange={(e) => updateSetting('polling', 'workItemsInterval', e.target.value)}
                placeholder="*/15 * * * *"
                disabled={!settings.polling.workItemsEnabled}
              />
              <p className="text-xs text-muted-foreground mt-1">Every 15 minutes</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Pull Requests Polling</label>
                <Switch
                  checked={settings.polling.pullRequestEnabled}
                  onCheckedChange={(checked) => updateSetting('polling', 'pullRequestEnabled', checked)}
                />
              </div>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                value={settings.polling.pullRequestInterval}
                onChange={(e) => updateSetting('polling', 'pullRequestInterval', e.target.value)}
                placeholder="0 */10 * * *"
                disabled={!settings.polling.pullRequestEnabled}
              />
              <p className="text-xs text-muted-foreground mt-1">Every 10 hours</p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Overdue Check Polling</label>
                <Switch
                  checked={settings.polling.overdueCheckEnabled}
                  onCheckedChange={(checked) => updateSetting('polling', 'overdueCheckEnabled', checked)}
                />
              </div>
              <input
                type="text"
                className="w-full px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                value={settings.polling.overdueCheckInterval}
                onChange={(e) => updateSetting('polling', 'overdueCheckInterval', e.target.value)}
                placeholder="0 9 * * *"
                disabled={!settings.polling.overdueCheckEnabled}
              />
              <p className="text-xs text-muted-foreground mt-1">Daily at 9 AM</p>
            </div>
          </div>
        </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
        <div className="bg-card dark:bg-[#111111] p-6 rounded-2xl border border-border dark:border-[#1a1a1a] shadow-sm">
          <h3 className="text-lg font-medium text-foreground mb-4">Security Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Webhook Secret</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                value={settings.security.webhookSecret}
                onChange={(e) => updateSetting('security', 'webhookSecret', e.target.value)}
                placeholder="Enter webhook secret"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">API Token</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-border dark:border-[#1a1a1a] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-background text-foreground placeholder:text-muted-foreground"
                value={settings.security.apiToken}
                onChange={(e) => updateSetting('security', 'apiToken', e.target.value)}
                placeholder="Enter API token"
              />
            </div>
          </div>
        </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
