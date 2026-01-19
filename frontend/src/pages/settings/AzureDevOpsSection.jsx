import React, { useState, useCallback } from 'react'
import { Database, TestTube, Eye, EyeOff, RefreshCw } from 'lucide-react'
import axios from 'axios'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useToast } from '../../hooks/use-toast'

export default function AzureDevOpsSection({ data, onChange, errors }) {
  const { toast } = useToast()
  const [showPat, setShowPat] = useState(false)
  const [testing, setTesting] = useState(false)
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  const handleChange = useCallback((field, value) => {
    onChange({ ...data, [field]: value })
  }, [data, onChange])

  const handleTestConnection = async () => {
    try {
      setTesting(true)
      await axios.post('/api/settings/test-connection', {
        organization: data.organization,
        project: data.project,
        pat: data.personalAccessToken,
        baseUrl: data.baseUrl
      })
      toast({ title: "Connection Successful", description: "Azure DevOps connection test passed!" })
    } catch (error) {
      toast({ title: "Connection Failed", description: error.response?.data?.error || error.message, variant: "destructive" })
    } finally {
      setTesting(false)
    }
  }

  const fetchProjects = useCallback(async () => {
    if (loadingProjects) return
    setLoadingProjects(true)
    try {
      const token = localStorage.getItem('token')
      let patToUse = data.personalAccessToken
      if (patToUse === '***') patToUse = 'USE_SAVED_PAT'
      
      if (!patToUse || !data.organization) {
        toast({ title: "Missing Information", description: "Please enter Organization and PAT first.", variant: "destructive" })
        return
      }
      
      const response = await axios.post('/api/settings/fetch-projects', {
        organization: data.organization,
        pat: patToUse,
        baseUrl: data.baseUrl
      }, { headers: { Authorization: `Bearer ${token}` } })
      
      const fetchedProjects = response.data.projects || []
      if (data.project && !fetchedProjects.find(p => p.name === data.project)) {
        fetchedProjects.unshift({ id: 'current', name: data.project })
      }
      setProjects(fetchedProjects)
      toast({ title: "Projects Loaded", description: `Found ${fetchedProjects.length} projects.` })
    } catch (error) {
      setProjects([])
      toast({ title: "Failed to Load Projects", description: error.response?.data?.error || error.message, variant: "destructive" })
    } finally {
      setLoadingProjects(false)
    }
  }, [loadingProjects, data.organization, data.personalAccessToken, data.baseUrl, data.project, toast])

  const canTest = data.personalAccessToken && data.personalAccessToken !== '***' && data.organization

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
          <Button variant="outline" onClick={handleTestConnection} disabled={testing || !canTest} className="group">
            <TestTube className={`h-4 w-4 mr-2 ${testing ? 'animate-pulse' : 'group-hover:scale-110'} transition-transform`} />
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
              value={data.organization}
              onChange={(e) => handleChange('organization', e.target.value)}
            />
            {errors?.organization && <p className="text-sm text-red-600">{errors.organization}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={data.project} onValueChange={(value) => handleChange('project', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      !data.organization || !data.personalAccessToken
                        ? "Enter organization and PAT first..."
                        : loadingProjects ? "Loading..." : projects.length === 0 ? "Click refresh to load" : "Select a project..."
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectGroup>
                      {loadingProjects && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                      {!loadingProjects && projects.length === 0 && data.organization && data.personalAccessToken && (
                        <SelectItem value="no-projects" disabled>Click refresh to load</SelectItem>
                      )}
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.name}>{project.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchProjects}
                disabled={!data.organization || !data.personalAccessToken || loadingProjects}
                className="px-3"
              >
                <RefreshCw className={`h-4 w-4 ${loadingProjects ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {errors?.project && <p className="text-sm text-red-600">{errors.project}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pat">Personal Access Token</Label>
          <div className="relative">
            <Input
              id="pat"
              type={showPat ? 'text' : 'password'}
              placeholder={data.personalAccessToken === '***' ? 'Enter new PAT or leave unchanged' : 'your-personal-access-token'}
              value={data.personalAccessToken}
              onChange={(e) => handleChange('personalAccessToken', e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPat(!showPat)}
            >
              {showPat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {errors?.personalAccessToken && <p className="text-sm text-red-600">{errors.personalAccessToken}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="baseUrl">Base URL</Label>
          <Input
            id="baseUrl"
            placeholder="https://dev.azure.com"
            value={data.baseUrl}
            onChange={(e) => handleChange('baseUrl', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )
}
