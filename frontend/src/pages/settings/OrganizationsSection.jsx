import React, { useState } from 'react'
import { Building2, Plus, Trash2, Check, ExternalLink, TestTube, Pencil, Star } from 'lucide-react'
import { useOrganization } from '../../contexts/OrganizationContext'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'

const emptyOrg = {
  name: '',
  azureDevOps: {
    organization: '',
    project: '',
    pat: '',
    baseUrl: 'https://dev.azure.com'
  }
}

export default function OrganizationsSection() {
  const { 
    organizations, 
    currentOrganization,
    addOrganization, 
    updateOrganization, 
    deleteOrganization,
    testConnection,
    setDefaultOrganization,
    switchOrganization
  } = useOrganization()

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [formData, setFormData] = useState(emptyOrg)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [errors, setErrors] = useState({})
  const [projects, setProjects] = useState([])
  const [fetchingProjects, setFetchingProjects] = useState(false)

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name?.trim()) newErrors.name = 'Name is required'
    if (!formData.azureDevOps.organization?.trim()) newErrors.organization = 'Organization is required'
    if (!formData.azureDevOps.project?.trim()) newErrors.project = 'Project is required'
    if (!formData.azureDevOps.pat?.trim() && formData.azureDevOps.pat !== '********') {
      newErrors.pat = 'Personal Access Token is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAdd = () => {
    setFormData(emptyOrg)
    setErrors({})
    setTestResult(null)
    setProjects([])
    setShowAddDialog(true)
  }

  const handleEdit = (org) => {
    setSelectedOrg(org)
    setFormData({
      name: org.name,
      azureDevOps: {
        organization: org.azureDevOps?.organization || '',
        project: org.azureDevOps?.project || '',
        pat: '********',
        baseUrl: org.azureDevOps?.baseUrl || 'https://dev.azure.com'
      }
    })
    setErrors({})
    setTestResult(null)
    setProjects([])
    setShowEditDialog(true)
  }

  const handleDelete = (org) => {
    setSelectedOrg(org)
    setShowDeleteDialog(true)
  }

  const handleTestConnection = async () => {
    if (!formData.azureDevOps.organization || !formData.azureDevOps.project) {
      setTestResult({ success: false, error: 'Organization and project are required' })
      return
    }
    
    setTesting(true)
    setTestResult(null)
    
    try {
      // For new orgs or when PAT is provided, test directly
      // For existing orgs with masked PAT, use the saved credentials
      if (selectedOrg && formData.azureDevOps.pat === '********') {
        const result = await testConnection(selectedOrg._id)
        setTestResult(result)
      } else {
        // Test with provided credentials via a direct API call
        const response = await fetch('/api/settings/test-connection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            organization: formData.azureDevOps.organization,
            project: formData.azureDevOps.project,
            pat: formData.azureDevOps.pat,  // Use 'pat' field name consistently
            baseUrl: formData.azureDevOps.baseUrl
          })
        })
        const result = await response.json()
        setTestResult(result)
      }
    } catch (error) {
      setTestResult({ success: false, error: error.message })
    } finally {
      setTesting(false)
    }
  }

  const handleFetchProjects = async () => {
    if (!formData.azureDevOps.organization) {
      setErrors(prev => ({ ...prev, organization: 'Organization is required' }))
      return
    }
    
    // For new orgs, require PAT to be entered
    if (!selectedOrg && !formData.azureDevOps.pat) {
      setErrors(prev => ({ ...prev, pat: 'Enter PAT to fetch projects' }))
      return
    }
    
    setFetchingProjects(true)
    setProjects([])
    setErrors(prev => ({ ...prev, project: null }))
    
    try {
      let result
      
      // If editing existing org with masked PAT, use saved credentials
      if (selectedOrg && formData.azureDevOps.pat === '********') {
        const response = await fetch(`/api/organizations/${selectedOrg._id}/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        result = await response.json()
      } else {
        // For new orgs or when PAT is changed, use provided credentials
        const response = await fetch('/api/settings/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            organization: formData.azureDevOps.organization,
            personalAccessToken: formData.azureDevOps.pat,
            baseUrl: formData.azureDevOps.baseUrl
          })
        })
        result = await response.json()
      }
      
      if (result.projects) {
        setProjects(result.projects)
      } else {
        setErrors(prev => ({ ...prev, project: result.error || 'Failed to fetch projects' }))
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, project: error.message }))
    } finally {
      setFetchingProjects(false)
    }
  }

  const handleSaveNew = async () => {
    if (!validateForm()) return
    
    setSaving(true)
    try {
      const result = await addOrganization({
        name: formData.name,
        azureDevOps: formData.azureDevOps
      })
      
      if (result.success) {
        setShowAddDialog(false)
        setFormData(emptyOrg)
      } else {
        setErrors({ submit: result.error })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!validateForm()) return
    
    setSaving(true)
    try {
      const updates = {
        name: formData.name,
        azureDevOps: {
          organization: formData.azureDevOps.organization,
          project: formData.azureDevOps.project,
          baseUrl: formData.azureDevOps.baseUrl
        }
      }
      
      // Only include PAT if changed
      if (formData.azureDevOps.pat !== '********') {
        updates.azureDevOps.pat = formData.azureDevOps.pat
      }
      
      const result = await updateOrganization(selectedOrg._id, updates)
      
      if (result.success) {
        setShowEditDialog(false)
        setSelectedOrg(null)
      } else {
        setErrors({ submit: result.error })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    const result = await deleteOrganization(selectedOrg._id)
    if (result.success) {
      setShowDeleteDialog(false)
      setSelectedOrg(null)
    }
  }

  const handleSetDefault = async (org) => {
    await setDefaultOrganization(org._id)
  }

  const formContent = (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Display Name</Label>
        <Input
          id="name"
          placeholder="My Azure DevOps Org"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="organization">Azure DevOps Organization</Label>
        <Input
          id="organization"
          placeholder="myorg"
          value={formData.azureDevOps.organization}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            azureDevOps: { ...prev.azureDevOps, organization: e.target.value }
          }))}
        />
        {errors.organization && <p className="text-sm text-destructive">{errors.organization}</p>}
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="pat">Personal Access Token</Label>
        <Input
          id="pat"
          type="password"
          placeholder="Enter PAT"
          value={formData.azureDevOps.pat}
          onChange={(e) => setFormData(prev => ({ 
            ...prev, 
            azureDevOps: { ...prev.azureDevOps, pat: e.target.value }
          }))}
        />
        {errors.pat && <p className="text-sm text-destructive">{errors.pat}</p>}
      </div>
      
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="project">Project</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFetchProjects}
            disabled={fetchingProjects || !formData.azureDevOps.organization || (!selectedOrg && !formData.azureDevOps.pat)}
            className="h-6 text-xs"
          >
            {fetchingProjects ? 'Fetching...' : 'Fetch Projects'}
          </Button>
        </div>
        {projects.length > 0 ? (
          <Select
            value={formData.azureDevOps.project}
            onValueChange={(value) => setFormData(prev => ({ 
              ...prev, 
              azureDevOps: { ...prev.azureDevOps, project: value }
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {projects.map(p => (
                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="project"
            placeholder="MyProject"
            value={formData.azureDevOps.project}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              azureDevOps: { ...prev.azureDevOps, project: e.target.value }
            }))}
          />
        )}
        {errors.project && <p className="text-sm text-destructive">{errors.project}</p>}
      </div>
      
      <div className="flex items-center gap-3 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={handleTestConnection}
          disabled={testing}
        >
          <TestTube className="h-4 w-4 mr-2" />
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        
        {testResult && (
          <span className={`text-sm ${testResult.success ? 'text-green-600' : 'text-destructive'}`}>
            {testResult.success ? '✓ Connected!' : testResult.error}
          </span>
        )}
      </div>
      
      {errors.submit && (
        <p className="text-sm text-destructive">{errors.submit}</p>
      )}
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organizations
            </CardTitle>
            <CardDescription>
              Manage your Azure DevOps organizations
            </CardDescription>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Organization
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {organizations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No organizations configured</p>
            <p className="text-sm">Add your first Azure DevOps organization to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {organizations.map((org) => (
              <div 
                key={org._id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  currentOrganization?._id === org._id ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{org.name}</span>
                      {org.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                      {currentOrganization?._id === org._id && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {org.azureDevOps?.organization}/{org.azureDevOps?.project}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {currentOrganization?._id !== org._id && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => switchOrganization(org._id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Switch
                    </Button>
                  )}
                  {!org.isDefault && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleSetDefault(org)}
                      title="Set as default"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit(org)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {organizations.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(org)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <DialogDescription>
              Connect a new Azure DevOps organization
            </DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNew} disabled={saving}>
              {saving ? 'Adding...' : 'Add Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update organization settings
            </DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedOrg?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
