import React, { useState, useCallback } from 'react'
import { Bot, Eye, EyeOff, RefreshCw } from 'lucide-react'
import axios from 'axios'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useToast } from '../../hooks/use-toast'

export default function AIConfigSection({ data, onChange, errors }) {
  const { toast } = useToast()
  const [showSecrets, setShowSecrets] = useState({})
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)

  const handleChange = useCallback((field, value) => {
    onChange({ ...data, [field]: value })
  }, [data, onChange])

  const handleProviderChange = useCallback((newProvider) => {
    const currentProvider = data.provider
    if (currentProvider !== newProvider) {
      onChange({ ...data, provider: newProvider, model: '' })
      setModels([])
    }
  }, [data, onChange])

  const toggleSecretVisibility = useCallback((field) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))
  }, [])

  const fetchModels = useCallback(async () => {
    if (loadingModels || !data.provider) return
    setLoadingModels(true)
    try {
      const token = localStorage.getItem('token')
      const currentOrgId = localStorage.getItem('currentOrganizationId')
      const headers = { Authorization: `Bearer ${token}` }
      if (currentOrgId) headers['X-Organization-ID'] = currentOrgId
      
      const response = await axios.get(`/api/ai/models/${data.provider}`, { headers })
      setModels(response.data.models || [])
    } catch (error) {
      setModels([])
      const message = error.userMessage || error.response?.data?.error || 'Failed to load models'
      toast({ title: "Failed to Load Models", description: message, variant: "destructive" })
    } finally {
      setLoadingModels(false)
    }
  }, [loadingModels, data.provider, toast])

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
          <Select value={data.provider} onValueChange={handleProviderChange}>
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
        
        {data.provider === 'openai' && (
          <div className="space-y-2">
            <Label htmlFor="openaiKey">OpenAI API Key</Label>
            <div className="relative">
              <Input
                id="openaiKey"
                type={showSecrets.openai ? 'text' : 'password'}
                placeholder="sk-..."
                value={data.openaiApiKey}
                onChange={(e) => handleChange('openaiApiKey', e.target.value)}
              />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => toggleSecretVisibility('openai')}>
                {showSecrets.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {data.provider === 'groq' && (
          <div className="space-y-2">
            <Label htmlFor="groqKey">Groq API Key</Label>
            <div className="relative">
              <Input
                id="groqKey"
                type={showSecrets.groq ? 'text' : 'password'}
                placeholder="gsk_..."
                value={data.groqApiKey}
                onChange={(e) => handleChange('groqApiKey', e.target.value)}
              />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => toggleSecretVisibility('groq')}>
                {showSecrets.groq ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {data.provider === 'gemini' && (
          <div className="space-y-2">
            <Label htmlFor="geminiKey">Gemini API Key</Label>
            <div className="relative">
              <Input
                id="geminiKey"
                type={showSecrets.gemini ? 'text' : 'password'}
                placeholder="AIza..."
                value={data.geminiApiKey}
                onChange={(e) => handleChange('geminiApiKey', e.target.value)}
              />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => toggleSecretVisibility('gemini')}>
                {showSecrets.gemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={data.model} onValueChange={(value) => handleChange('model', value)} disabled={!data.provider}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    !data.provider ? "Select a provider first..." : loadingModels ? "Loading..." : models.length === 0 ? "Click refresh to load" : "Select a model..."
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {loadingModels && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                    {!loadingModels && models.length === 0 && data.provider && (
                      <SelectItem value="no-models" disabled>Click refresh to load</SelectItem>
                    )}
                    {models.map(model => (
                      <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={fetchModels} disabled={!data.provider || loadingModels} className="px-3">
              <RefreshCw className={`h-4 w-4 ${loadingModels ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {errors?.aiModel && <p className="text-sm text-red-600">{errors.aiModel}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
