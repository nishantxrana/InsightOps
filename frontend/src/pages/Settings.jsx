import React, { useState, useEffect } from 'react'
import { Save, TestTube, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { apiService } from '../api/apiService'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showSecrets, setShowSecrets] = useState({})
  const [testResult, setTestResult] = useState(null)
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
      model: 'gpt-3.5-turbo'
    },
    notifications: {
      teamsWebhookUrl: '',
      slackWebhookUrl: '',
      enabled: true
    },
    polling: {
      workItemsInterval: '*/15 * * * *',
      pipelineInterval: '*/10 * * * *',
      pullRequestInterval: '0 */2 * * *',
      overdueCheckInterval: '0 9 * * *'
    }
  })

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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">Configure your Azure DevOps monitoring agent</p>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {testResult.success ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Azure DevOps Configuration */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Azure DevOps Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Organization</label>
              <input
                type="text"
                className="input"
                value={settings.azureDevOps.organization}
                onChange={(e) => updateSetting('azureDevOps', 'organization', e.target.value)}
                placeholder="your-organization"
              />
            </div>
            <div>
              <label className="label">Project</label>
              <input
                type="text"
                className="input"
                value={settings.azureDevOps.project}
                onChange={(e) => updateSetting('azureDevOps', 'project', e.target.value)}
                placeholder="your-project"
              />
            </div>
            <div>
              <label className="label">Personal Access Token</label>
              <div className="relative">
                <input
                  type={showSecrets.pat ? 'text' : 'password'}
                  className="input pr-10"
                  value={settings.azureDevOps.personalAccessToken}
                  onChange={(e) => updateSetting('azureDevOps', 'personalAccessToken', e.target.value)}
                  placeholder="your-personal-access-token"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => toggleSecretVisibility('pat')}
                >
                  {showSecrets.pat ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Base URL</label>
              <input
                type="url"
                className="input"
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

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="btn btn-secondary flex items-center space-x-2"
        >
          <TestTube className="h-4 w-4" />
          <span>{testing ? 'Testing...' : 'Test Connection'}</span>
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  )
}
