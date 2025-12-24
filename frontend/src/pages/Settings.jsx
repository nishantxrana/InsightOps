import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Save, Database, Bot, Bell, Webhook, Clock, Shield, Menu } from 'lucide-react'
import axios from 'axios'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet'
import { useToast } from '../hooks/use-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'

// Import section components
import AzureDevOpsSection from './settings/AzureDevOpsSection'
import AIConfigSection from './settings/AIConfigSection'
import NotificationsSection from './settings/NotificationsSection'
import WebhooksSection from './settings/WebhooksSection'
import PollingSection from './settings/PollingSection'
import SecuritySection from './settings/SecuritySection'

const settingsSections = [
  { id: 'azure', name: 'Azure DevOps', icon: Database },
  { id: 'ai', name: 'AI Configuration', icon: Bot },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'webhooks', name: 'Webhook URLs', icon: Webhook },
  { id: 'polling', name: 'Polling', icon: Clock },
  { id: 'security', name: 'Security', icon: Shield }
]

// Default settings structure
const getDefaultSettings = () => ({
  azure: {
    organization: '',
    project: '',
    personalAccessToken: '',
    baseUrl: 'https://dev.azure.com'
  },
  ai: {
    provider: 'gemini',
    openaiApiKey: '',
    groqApiKey: '',
    geminiApiKey: '',
    model: 'gemini-2.0-flash'
  },
  notifications: {
    teamsWebhookUrl: '',
    slackWebhookUrl: '',
    googleChatWebhookUrl: '',
    teamsEnabled: false,
    slackEnabled: false,
    googleChatEnabled: false,
    enabled: true
  },
  polling: {
    workItemsInterval: '*/10 * * * *',
    pullRequestInterval: '0 */10 * * *',
    overdueCheckInterval: '0 */10 * * *',
    workItemsEnabled: true,
    pullRequestEnabled: true,
    overdueCheckEnabled: true,
    overdueFilterEnabled: true,
    overdueMaxDays: 60
  },
  security: {
    webhookSecret: '',
    apiToken: '',
    enableRateLimit: true,
    maxRequestsPerMinute: 100
  }
})

export default function Settings() {
  const { toast } = useToast()
  const [activeSection, setActiveSection] = useState('azure')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  
  // Per-tab settings state
  const [tabSettings, setTabSettings] = useState(getDefaultSettings())
  const [originalTabSettings, setOriginalTabSettings] = useState(getDefaultSettings())
  
  // Unsaved changes dialog
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const pendingSectionRef = useRef(null)

  // Check if current tab has changes
  const hasCurrentTabChanges = useCallback(() => {
    return JSON.stringify(tabSettings[activeSection]) !== JSON.stringify(originalTabSettings[activeSection])
  }, [tabSettings, originalTabSettings, activeSection])

  // Validate current section
  const validateCurrentSection = useCallback(() => {
    const errors = {}
    const data = tabSettings[activeSection]
    
    if (activeSection === 'azure') {
      if (!data.organization?.trim()) errors.organization = 'Organization is required'
      if (!data.project?.trim()) errors.project = 'Project is required'
      if (!data.personalAccessToken?.trim() && data.personalAccessToken !== '***') {
        errors.personalAccessToken = 'Personal Access Token is required'
      }
    }
    
    if (activeSection === 'ai') {
      if (data.provider && !data.model?.trim()) {
        errors.aiModel = 'Please select a model for the chosen AI provider'
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [tabSettings, activeSection])

  // Load settings from server
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        const response = await axios.get('/api/settings')
        const data = response.data
        
        const loaded = {
          azure: {
            organization: data.azureDevOps?.organization || '',
            project: data.azureDevOps?.project || '',
            personalAccessToken: data.azureDevOps?.pat || '',
            baseUrl: data.azureDevOps?.baseUrl || 'https://dev.azure.com'
          },
          ai: {
            provider: data.ai?.provider || 'gemini',
            model: data.ai?.model || 'gemini-2.0-flash',
            openaiApiKey: data.ai?.apiKeys?.openai || '',
            groqApiKey: data.ai?.apiKeys?.groq || '',
            geminiApiKey: data.ai?.apiKeys?.gemini || ''
          },
          notifications: {
            enabled: data.notifications?.enabled !== undefined ? data.notifications.enabled : true,
            teamsWebhookUrl: data.notifications?.webhooks?.teams || '',
            slackWebhookUrl: data.notifications?.webhooks?.slack || '',
            googleChatWebhookUrl: data.notifications?.webhooks?.googleChat || '',
            teamsEnabled: data.notifications?.teamsEnabled ?? !!(data.notifications?.webhooks?.teams),
            slackEnabled: data.notifications?.slackEnabled ?? !!(data.notifications?.webhooks?.slack),
            googleChatEnabled: data.notifications?.googleChatEnabled ?? !!(data.notifications?.webhooks?.googleChat)
          },
          polling: data.polling || getDefaultSettings().polling,
          security: data.security || getDefaultSettings().security
        }
        
        setTabSettings(loaded)
        setOriginalTabSettings(JSON.parse(JSON.stringify(loaded)))
      } catch (error) {
        console.error('Failed to load settings:', error)
        toast({ title: "Error", description: "Failed to load settings", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [toast])

  // Handle section change with unsaved changes check
  const handleSectionChange = useCallback((newSection) => {
    if (newSection === activeSection) return
    
    if (hasCurrentTabChanges()) {
      pendingSectionRef.current = newSection
      setShowUnsavedDialog(true)
    } else {
      setActiveSection(newSection)
      setValidationErrors({})
    }
  }, [activeSection, hasCurrentTabChanges])

  // Discard changes and switch section
  const handleDiscardChanges = useCallback(() => {
    // Reset current tab to original
    setTabSettings(prev => ({
      ...prev,
      [activeSection]: JSON.parse(JSON.stringify(originalTabSettings[activeSection]))
    }))
    setShowUnsavedDialog(false)
    setValidationErrors({})
    if (pendingSectionRef.current) {
      setActiveSection(pendingSectionRef.current)
      pendingSectionRef.current = null
    }
  }, [activeSection, originalTabSettings])

  // Update tab data
  const updateTabData = useCallback((sectionId, newData) => {
    setTabSettings(prev => ({ ...prev, [sectionId]: newData }))
  }, [])

  // Save current tab settings
  const handleSave = async () => {
    if (!hasCurrentTabChanges()) {
      toast({ title: "No Changes", description: "No changes detected to save." })
      return
    }
    
    if (!validateCurrentSection()) {
      toast({ title: "Validation Error", description: "Please fix validation errors before saving.", variant: "destructive" })
      return
    }
    
    try {
      setSaving(true)
      const data = tabSettings[activeSection]
      let backendPayload = {}
      
      // Build payload based on active section
      if (activeSection === 'azure') {
        backendPayload.azureDevOps = {
          organization: data.organization,
          project: data.project,
          baseUrl: data.baseUrl
        }
        if (data.personalAccessToken && data.personalAccessToken !== '***') {
          backendPayload.azureDevOps.pat = data.personalAccessToken
        }
      }
      
      if (activeSection === 'ai') {
        backendPayload.ai = {
          provider: data.provider,
          model: data.model
        }
        const apiKeys = {}
        if (data.openaiApiKey && data.openaiApiKey !== '***') apiKeys.openai = data.openaiApiKey
        if (data.groqApiKey && data.groqApiKey !== '***') apiKeys.groq = data.groqApiKey
        if (data.geminiApiKey && data.geminiApiKey !== '***') apiKeys.gemini = data.geminiApiKey
        if (Object.keys(apiKeys).length > 0) backendPayload.ai.apiKeys = apiKeys
      }
      
      if (activeSection === 'notifications') {
        backendPayload.notifications = data
      }
      
      if (activeSection === 'polling') {
        backendPayload.polling = data
      }
      
      if (activeSection === 'security') {
        backendPayload.security = data
      }
      
      await axios.put('/api/settings', backendPayload)
      
      // Update original to match current (mark as saved)
      setOriginalTabSettings(prev => ({
        ...prev,
        [activeSection]: JSON.parse(JSON.stringify(tabSettings[activeSection]))
      }))
      
      toast({ title: "Settings Saved", description: `${settingsSections.find(s => s.id === activeSection)?.name} settings saved successfully!` })
    } catch (error) {
      toast({ title: "Save Failed", description: error.response?.data?.error || error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Sidebar component
  const Sidebar = ({ className = "", onSelect }) => (
    <div className={`space-y-2 ${className}`}>
      {settingsSections.map((section) => {
        const Icon = section.icon
        const hasChanges = JSON.stringify(tabSettings[section.id]) !== JSON.stringify(originalTabSettings[section.id])
        return (
          <button
            key={section.id}
            onClick={() => onSelect ? onSelect(section.id) : handleSectionChange(section.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors ${
              activeSection === section.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium flex-1">{section.name}</span>
            {hasChanges && (
              <span className="w-2 h-2 rounded-full bg-orange-500" title="Unsaved changes" />
            )}
          </button>
        )
      })}
    </div>
  )

  if (loading) return <LoadingSpinner />

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
        .animate-slide-up {
          animation: slideUp 0.6s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in {settingsSections.find(s => s.id === activeSection)?.name}. 
              Do you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowUnsavedDialog(false)
              pendingSectionRef.current = null
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="animate-slide-up">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="py-4">
                  <h2 className="text-lg font-semibold mb-4">Settings</h2>
                  <Sidebar onSelect={(id) => {
                    handleSectionChange(id)
                  }} />
                </div>
              </SheetContent>
            </Sheet>
            
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Configure your Azure DevOps monitoring agent</p>
            </div>
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasCurrentTabChanges()} 
            className="group relative overflow-hidden bg-foreground hover:bg-foreground/90 text-background"
          >
            <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
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
          {activeSection === 'azure' && (
            <AzureDevOpsSection 
              data={tabSettings.azure} 
              onChange={(data) => updateTabData('azure', data)}
              errors={validationErrors}
            />
          )}
          {activeSection === 'ai' && (
            <AIConfigSection 
              data={tabSettings.ai} 
              onChange={(data) => updateTabData('ai', data)}
              errors={validationErrors}
            />
          )}
          {activeSection === 'notifications' && (
            <NotificationsSection 
              data={tabSettings.notifications} 
              onChange={(data) => updateTabData('notifications', data)}
            />
          )}
          {activeSection === 'webhooks' && <WebhooksSection />}
          {activeSection === 'polling' && (
            <PollingSection 
              data={tabSettings.polling} 
              onChange={(data) => updateTabData('polling', data)}
            />
          )}
          {activeSection === 'security' && (
            <SecuritySection 
              data={tabSettings.security} 
              onChange={(data) => updateTabData('security', data)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
