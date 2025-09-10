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
import { apiService } from '../api/apiService'
import LoadingSpinner from '../components/LoadingSpinner'
import { useHealth } from '../contexts/HealthContext'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showSecrets, setShowSecrets] = useState({})
  const [testResult, setTestResult] = useState(null)
  const [activeTab, setActiveTab] = useState('azure')
  const [validationErrors, setValidationErrors] = useState({})
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
      enabled: true
    },
    polling: {
      workItemsInterval: '*/15 * * * *',
      pipelineInterval: '*/10 * * * *',
      pullRequestInterval: '0 */2 * * *',
      overdueCheckInterval: '0 9 * * *'
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
    
    // Azure DevOps validation
    if (!settings.azureDevOps.organization.trim()) {
      errors.organization = 'Organization is required'
    }
    if (!settings.azureDevOps.project.trim()) {
      errors.project = 'Project is required'
    }
    if (!settings.azureDevOps.personalAccessToken.trim()) {
      errors.personalAccessToken = 'Personal Access Token is required'
    }
    
    // AI validation
    if (settings.ai.provider === 'openai' && !settings.ai.openaiApiKey.trim()) {
      errors.openaiApiKey = 'OpenAI API Key is required when using OpenAI'
    }
    if (settings.ai.provider === 'groq' && !settings.ai.groqApiKey.trim()) {
      errors.groqApiKey = 'Groq API Key is required when using Groq'
    }
    if (settings.ai.provider === 'gemini' && !settings.ai.geminiApiKey.trim()) {
      errors.geminiApiKey = 'Gemini API Key is required when using Gemini'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const tabs = [
    { id: 'azure', name: 'Azure DevOps', icon: Database },
    { id: 'ai', name: 'AI Configuration', icon: Bot },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'polling', name: 'Polling', icon: Clock },
    { id: 'security', name: 'Security', icon: Shield }
  ]

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await apiService.getSettings()
      setSettings(data)
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!validateSettings()) {
      setTestResult({ success: false, message: 'Please fix validation errors before saving.' })
      return
    }
    
    try {
      setSaving(true)
      await apiService.updateSettings(settings)
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
      const result = await apiService.testConnection()
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
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Settings</h1>
            <p className="text-gray-600 text-sm mt-0.5">Configure your Azure DevOps monitoring agent</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              <TestTube className="h-4 w-4" />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3 animate-fade-in ${
          testResult.success 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`} style={{animationDelay: '0.1s'}}>
          {testResult.success ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
          <span className={testResult.success ? 'text-green-800' : 'text-red-800'}>
            {testResult.message}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Azure DevOps Configuration */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-fade-in" style={{animationDelay: '0.2s'}}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Azure DevOps Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={settings.azureDevOps.organization}
                onChange={(e) => updateSetting('azureDevOps', 'organization', e.target.value)}
                placeholder="your-organization"
              />
              {validationErrors.organization && (
                <p className="text-red-600 text-xs mt-1">{validationErrors.organization}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={settings.azureDevOps.project}
                onChange={(e) => updateSetting('azureDevOps', 'project', e.target.value)}
                placeholder="your-project"
              />
              {validationErrors.project && (
                <p className="text-red-600 text-xs mt-1">{validationErrors.project}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Personal Access Token</label>
              <div className="relative">
                <input
                  type={showSecrets.pat ? 'text' : 'password'}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={settings.azureDevOps.personalAccessToken}
                  onChange={(e) => updateSetting('azureDevOps', 'personalAccessToken', e.target.value)}
                  placeholder="your-personal-access-token"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
                  onClick={() => toggleSecretVisibility('pat')}
                >
                  {showSecrets.pat ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {validationErrors.personalAccessToken && (
                <p className="text-red-600 text-xs mt-1">{validationErrors.personalAccessToken}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={settings.azureDevOps.baseUrl}
                onChange={(e) => updateSetting('azureDevOps', 'baseUrl', e.target.value)}
                placeholder="https://dev.azure.com"
              />
            </div>
          </div>
        </div>

        {/* AI Configuration */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">AI Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="label">AI Provider</label>
              <select
                className="input"
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
                <label className="label">OpenAI API Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.openai ? 'text' : 'password'}
                    className="input pr-10"
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
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {settings.ai.provider === 'groq' && (
              <div>
                <label className="label">Groq API Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.groq ? 'text' : 'password'}
                    className="input pr-10"
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
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
            {settings.ai.provider === 'gemini' && (
              <div>
                <label className="label">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.gemini ? 'text' : 'password'}
                    className="input pr-10"
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
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className="label">Model</label>
              <input
                type="text"
                className="input"
                value={settings.ai.model}
                onChange={(e) => updateSetting('ai', 'model', e.target.value)}
                placeholder="gpt-3.5-turbo"
              />
            </div>
          </div>
        </div>

        {/* Notification Configuration */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifications-enabled"
                className="h-4 w-4 text-azure-600 focus:ring-azure-500 border-gray-300 rounded"
                checked={settings.notifications.enabled}
                onChange={(e) => updateSetting('notifications', 'enabled', e.target.checked)}
              />
              <label htmlFor="notifications-enabled" className="ml-2 text-sm text-gray-900">
                Enable notifications
              </label>
            </div>
            <div>
              <label className="label">Microsoft Teams Webhook URL</label>
              <input
                type="url"
                className="input"
                value={settings.notifications.teamsWebhookUrl}
                onChange={(e) => updateSetting('notifications', 'teamsWebhookUrl', e.target.value)}
                placeholder="https://outlook.office.com/webhook/..."
              />
            </div>
            <div>
              <label className="label">Slack Webhook URL</label>
              <input
                type="url"
                className="input"
                value={settings.notifications.slackWebhookUrl}
                onChange={(e) => updateSetting('notifications', 'slackWebhookUrl', e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
          </div>
        </div>

        {/* Polling Configuration */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Polling Intervals</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Work Items (cron expression)</label>
              <input
                type="text"
                className="input"
                value={settings.polling.workItemsInterval}
                onChange={(e) => updateSetting('polling', 'workItemsInterval', e.target.value)}
                placeholder="*/15 * * * *"
              />
              <p className="text-xs text-gray-500 mt-1">Every 15 minutes</p>
            </div>
            <div>
              <label className="label">Pipelines (cron expression)</label>
              <input
                type="text"
                className="input"
                value={settings.polling.pipelineInterval}
                onChange={(e) => updateSetting('polling', 'pipelineInterval', e.target.value)}
                placeholder="*/10 * * * *"
              />
              <p className="text-xs text-gray-500 mt-1">Every 10 minutes</p>
            </div>
            <div>
              <label className="label">Pull Requests (cron expression)</label>
              <input
                type="text"
                className="input"
                value={settings.polling.pullRequestInterval}
                onChange={(e) => updateSetting('polling', 'pullRequestInterval', e.target.value)}
                placeholder="0 */2 * * *"
              />
              <p className="text-xs text-gray-500 mt-1">Every 2 hours</p>
            </div>
            <div>
              <label className="label">Overdue Check (cron expression)</label>
              <input
                type="text"
                className="input"
                value={settings.polling.overdueCheckInterval}
                onChange={(e) => updateSetting('polling', 'overdueCheckInterval', e.target.value)}
                placeholder="0 9 * * *"
              />
              <p className="text-xs text-gray-500 mt-1">Daily at 9 AM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
