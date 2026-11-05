import { useState, useEffect } from "react";
import { Building2, Plus, Trash2, Check, TestTube, Pencil, Star, Filter } from "lucide-react";
import { useOrganization } from "../../contexts/OrganizationContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { TagInput } from "../../components/ui/TagInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { EmptyState } from "@/components/kit/EmptyState";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { SettingsSectionHeader } from "@/components/kit/SettingsSectionHeader";
import { SettingsPanel } from "@/components/kit/SettingsPanel";

const emptyOrg = {
  name: "",
  azureDevOps: {
    organization: "",
    project: "",
    pat: "",
    baseUrl: "https://dev.azure.com",
  },
  productionFilters: {
    enabled: false,
    branches: [],
    environments: [],
    buildDefinitions: [],
  },
};

export default function OrganizationsSection({ openAddRequested = false, onOpenAddHandled }) {
  const {
    organizations,
    currentOrganization,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    testConnection,
    setDefaultOrganization,
    switchOrganization,
  } = useOrganization();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [formData, setFormData] = useState(emptyOrg);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [projects, setProjects] = useState([]);
  const [fetchingProjects, setFetchingProjects] = useState(false);

  useEffect(() => {
    if (openAddRequested) {
      handleAdd();
      onOpenAddHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only when parent requests
  }, [openAddRequested]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = "Name is required";
    if (!formData.azureDevOps.organization?.trim())
      newErrors.organization = "Organization is required";
    if (!formData.azureDevOps.project?.trim()) newErrors.project = "Project is required";
    if (!formData.azureDevOps.pat?.trim() && formData.azureDevOps.pat !== "********") {
      newErrors.pat = "Personal Access Token is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = () => {
    setFormData(emptyOrg);
    setErrors({});
    setTestResult(null);
    setProjects([]);
    setSelectedOrg(null);
    setShowAddDialog(true);
  };

  const handleEdit = (org) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name,
      azureDevOps: {
        organization: org.azureDevOps?.organization || "",
        project: org.azureDevOps?.project || "",
        pat: "********",
        baseUrl: org.azureDevOps?.baseUrl || "https://dev.azure.com",
      },
      productionFilters: org.productionFilters || {
        enabled: false,
        branches: [],
        environments: [],
        buildDefinitions: [],
      },
    });
    setErrors({});
    setTestResult(null);
    setProjects([]);
    setShowEditDialog(true);
  };

  const handleDelete = (org) => {
    setSelectedOrg(org);
    setShowDeleteDialog(true);
  };

  const handleTestConnection = async () => {
    if (!formData.azureDevOps.organization || !formData.azureDevOps.project) {
      setTestResult({ success: false, error: "Organization and project are required" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      if (selectedOrg && formData.azureDevOps.pat === "********") {
        const result = await testConnection(selectedOrg._id);
        setTestResult(result);
      } else {
        const response = await fetch("/api/settings/test-connection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            organization: formData.azureDevOps.organization,
            project: formData.azureDevOps.project,
            pat: formData.azureDevOps.pat,
            baseUrl: formData.azureDevOps.baseUrl,
          }),
        });
        const result = await response.json();
        setTestResult(result);
      }
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleFetchProjects = async () => {
    if (!formData.azureDevOps.organization) {
      setErrors((prev) => ({ ...prev, organization: "Organization is required" }));
      return;
    }

    if (!selectedOrg && !formData.azureDevOps.pat) {
      setErrors((prev) => ({ ...prev, pat: "Enter PAT to fetch projects" }));
      return;
    }

    setFetchingProjects(true);
    setProjects([]);
    setErrors((prev) => ({ ...prev, project: null }));

    try {
      let result;

      if (selectedOrg && formData.azureDevOps.pat === "********") {
        const response = await fetch(`/api/organizations/${selectedOrg._id}/projects`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        result = await response.json();
      } else {
        const response = await fetch("/api/settings/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            organization: formData.azureDevOps.organization,
            personalAccessToken: formData.azureDevOps.pat,
            baseUrl: formData.azureDevOps.baseUrl,
          }),
        });
        result = await response.json();
      }

      if (result.projects) {
        setProjects(result.projects);
      } else {
        setErrors((prev) => ({ ...prev, project: result.error || "Failed to fetch projects" }));
      }
    } catch (error) {
      setErrors((prev) => ({ ...prev, project: error.message }));
    } finally {
      setFetchingProjects(false);
    }
  };

  const handleSaveNew = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const result = await addOrganization({
        name: formData.name,
        azureDevOps: formData.azureDevOps,
        productionFilters: formData.productionFilters || {
          enabled: false,
          branches: [],
          environments: [],
          buildDefinitions: [],
        },
      });

      if (result.success) {
        setShowAddDialog(false);
        setFormData(emptyOrg);
      } else {
        setErrors({ submit: result.error });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const updates = {
        name: formData.name,
        azureDevOps: {
          organization: formData.azureDevOps.organization,
          project: formData.azureDevOps.project,
          baseUrl: formData.azureDevOps.baseUrl,
        },
        productionFilters: formData.productionFilters || {
          enabled: false,
          branches: [],
          environments: [],
          buildDefinitions: [],
        },
      };

      if (formData.azureDevOps.pat !== "********") {
        updates.azureDevOps.pat = formData.azureDevOps.pat;
      }

      const result = await updateOrganization(selectedOrg._id, updates);

      if (result.success) {
        setShowEditDialog(false);
        setSelectedOrg(null);
      } else {
        setErrors({ submit: result.error });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    const result = await deleteOrganization(selectedOrg._id);
    if (result.success) {
      setShowDeleteDialog(false);
      setSelectedOrg(null);
    }
  };

  const handleSetDefault = async (org) => {
    await setDefaultOrganization(org._id);
  };

  const formContent = (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="org-display-name">Display Name</Label>
        <Input
          id="org-display-name"
          placeholder="My Azure DevOps Org"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          aria-describedby={errors.name ? "org-display-name-error" : undefined}
        />
        {errors.name && (
          <p id="org-display-name-error" className="text-sm text-danger-foreground" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="org-ado-organization">Azure DevOps Organization</Label>
        <Input
          id="org-ado-organization"
          placeholder="myorg"
          value={formData.azureDevOps.organization}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              azureDevOps: { ...prev.azureDevOps, organization: e.target.value },
            }))
          }
          aria-describedby={errors.organization ? "org-ado-organization-error" : undefined}
        />
        {errors.organization && (
          <p
            id="org-ado-organization-error"
            className="text-sm text-danger-foreground"
            role="alert"
          >
            {errors.organization}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="org-pat">Personal Access Token (PAT)</Label>
        <Input
          id="org-pat"
          type="password"
          placeholder="Enter PAT"
          value={formData.azureDevOps.pat}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              azureDevOps: { ...prev.azureDevOps, pat: e.target.value },
            }))
          }
          aria-describedby="org-pat-help"
        />
        <p id="org-pat-help" className="text-xs text-muted-foreground">
          Required scopes:{" "}
          <span className="font-medium">
            Work Items (Read), Build (Read), Code (Read), Release (Read)
          </span>
          .{" "}
          <a
            href="https://dev.azure.com/_usersSettings/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Create a PAT →
          </a>
        </p>
        {errors.pat && (
          <p className="text-sm text-danger-foreground" role="alert">
            {errors.pat}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="org-project">
            Default Project
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (used when no project selected in header)
            </span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFetchProjects}
            disabled={
              fetchingProjects ||
              !formData.azureDevOps.organization ||
              (!selectedOrg && !formData.azureDevOps.pat)
            }
            className="h-8 text-xs"
          >
            {fetchingProjects ? "Fetching..." : "Fetch Projects"}
          </Button>
        </div>
        {projects.length > 0 ? (
          <Select
            value={formData.azureDevOps.project}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                azureDevOps: { ...prev.azureDevOps, project: value },
              }))
            }
          >
            <SelectTrigger id="org-project">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="org-project"
            placeholder="MyProject"
            value={formData.azureDevOps.project}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                azureDevOps: { ...prev.azureDevOps, project: e.target.value },
              }))
            }
          />
        )}
        {errors.project && (
          <p className="text-sm text-danger-foreground" role="alert">
            {errors.project}
          </p>
        )}
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label
              htmlFor="org-prod-filters"
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <Filter className="h-4 w-4" aria-hidden />
              Production Filters
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Define what constitutes &quot;production&quot; for reports and notifications
            </p>
          </div>
          <Switch
            id="org-prod-filters"
            checked={formData.productionFilters?.enabled || false}
            onCheckedChange={(checked) =>
              setFormData({
                ...formData,
                productionFilters: {
                  ...formData.productionFilters,
                  enabled: checked,
                },
              })
            }
          />
        </div>

        {formData.productionFilters?.enabled && (
          <div className="space-y-4 border-l-2 border-border pl-4">
            <div className="space-y-2">
              <Label>Production Branches</Label>
              <p className="text-xs text-muted-foreground">
                Used for:{" "}
                <Badge variant="secondary" className="text-xs">
                  Pull Requests
                </Badge>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Exact match or wildcards. Examples: main, master, release/*, *prod*
              </p>
              <TagInput
                value={formData.productionFilters?.branches || []}
                onChange={(branches) =>
                  setFormData({
                    ...formData,
                    productionFilters: {
                      ...formData.productionFilters,
                      branches,
                    },
                  })
                }
                placeholder="Add branch pattern..."
              />
            </div>

            <div className="space-y-2">
              <Label>Production Environments</Label>
              <p className="text-xs text-muted-foreground">
                Used for:{" "}
                <Badge variant="secondary" className="text-xs">
                  Releases
                </Badge>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Exact match or wildcards. Examples: Production, E3, Prod-*, *prod*
              </p>
              <TagInput
                value={formData.productionFilters?.environments || []}
                onChange={(environments) =>
                  setFormData({
                    ...formData,
                    productionFilters: {
                      ...formData.productionFilters,
                      environments,
                    },
                  })
                }
                placeholder="Add environment name..."
              />
            </div>

            <div className="space-y-2">
              <Label>Production Build Definitions</Label>
              <p className="text-xs text-muted-foreground">
                Used for:{" "}
                <Badge variant="secondary" className="text-xs">
                  Builds
                </Badge>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Exact match or wildcards. Examples: e3, Prod-*, *production*
              </p>
              <TagInput
                value={formData.productionFilters?.buildDefinitions || []}
                onChange={(buildDefinitions) =>
                  setFormData({
                    ...formData,
                    productionFilters: {
                      ...formData.productionFilters,
                      buildDefinitions,
                    },
                  })
                }
                placeholder="Add build definition pattern..."
              />
            </div>

            <div className="rounded-control bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">How filters work:</p>
              <ul className="ml-2 list-inside list-disc space-y-1">
                <li>
                  <strong>Builds:</strong> Filtered by definition name only (branch ignored)
                </li>
                <li>
                  <strong>Releases:</strong> Filtered by environment name only
                </li>
                <li>
                  <strong>PRs:</strong> Filtered by target branch only (where merging TO)
                </li>
                <li>
                  <strong>Wildcards:</strong> Use * to match any characters (e.g., *prod*,
                  release/*)
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={testing}
        >
          <TestTube className="mr-2 h-4 w-4" aria-hidden />
          {testing ? "Testing..." : "Test Connection"}
        </Button>

        {testResult && (
          <span
            className={`text-sm ${testResult.success ? "text-success-foreground" : "text-danger-foreground"}`}
            role="status"
          >
            {testResult.success ? "Connected" : testResult.error}
          </span>
        )}
      </div>

      {errors.submit && (
        <p className="text-sm text-danger-foreground" role="alert">
          {errors.submit}
        </p>
      )}
    </div>
  );

  return (
    <div>
      <SettingsSectionHeader
        title="Organizations"
        description="Manage your Azure DevOps organizations"
        actions={
          organizations.length > 0 ? (
            <Button onClick={handleAdd} size="sm">
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Add Organization
            </Button>
          ) : null
        }
      />

      {organizations.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="No organizations configured"
          description="Add your first Azure DevOps organization to get started"
          action={
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Add Organization
            </Button>
          }
        />
      ) : (
        <SettingsPanel className="px-0">
          {organizations.map((org) => {
            const isActive = currentOrganization?._id === org._id;
            return (
              <div
                key={org._id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{org.name}</span>
                    {org.isDefault ? <StatusBadge tone="neutral" label="Default" /> : null}
                    {isActive ? <StatusBadge tone="info" label="Active" /> : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {org.azureDevOps?.organization}
                    {org.azureDevOps?.project ? ` / ${org.azureDevOps.project}` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  {!isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => switchOrganization(org._id)}
                      aria-label={`Switch to ${org.name}`}
                    >
                      <Check className="mr-1 h-4 w-4" aria-hidden />
                      Switch
                    </Button>
                  ) : null}
                  {!org.isDefault ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => handleSetDefault(org)}
                      aria-label={`Set ${org.name} as default`}
                    >
                      <Star className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleEdit(org)}
                    aria-label={`Edit ${org.name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  {organizations.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-danger-foreground hover:text-danger-foreground"
                      onClick={() => handleDelete(org)}
                      aria-label={`Delete ${org.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </SettingsPanel>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <DialogDescription>Connect a new Azure DevOps organization</DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNew} disabled={saving}>
              {saving ? "Adding..." : "Add Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update organization settings</DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete{" "}
                <span className="font-semibold">&quot;{selectedOrg?.name}&quot;</span>?
              </p>
              <p className="text-sm text-muted-foreground">
                This will permanently remove all settings, notification history, and polling
                configuration for this organization. Your Azure DevOps data will not be affected.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
