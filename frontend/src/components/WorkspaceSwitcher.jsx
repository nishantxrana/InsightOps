import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Folder, Plus, Settings, AlertCircle } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command as CommandPrimitive } from "cmdk";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/** Session-scoped project list cache keyed by organization id. */
const projectsCache = new Map();

function orgInitials(name) {
  if (!name || typeof name !== "string") return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function OrgAvatar({ name, size = "md", className }) {
  const sizeClass =
    size === "lg"
      ? "h-8 w-8 text-xs"
      : size === "sm"
        ? "h-5 w-5 text-[9px]"
        : "h-7 w-7 text-[10px]";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border border-border bg-muted font-semibold text-muted-foreground",
        sizeClass,
        className
      )}
      aria-hidden
    >
      {orgInitials(name)}
    </span>
  );
}

async function fetchProjectsForOrg(orgId) {
  const response = await fetch(`/api/organizations/${orgId}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to load projects (${response.status})`);
  }
  const result = await response.json();
  return result.projects || [];
}

export default function WorkspaceSwitcher() {
  const {
    organizations,
    currentOrganization,
    currentProject,
    switchOrganization,
    switchProject,
    loading,
  } = useOrganization();
  const navigate = useNavigate();
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [fetchingProjects, setFetchingProjects] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [projectQuery, setProjectQuery] = useState("");

  const loadProjects = useCallback(async (orgId, { force = false } = {}) => {
    if (!orgId) {
      setProjects([]);
      setFetchError(null);
      return;
    }
    if (!force && projectsCache.has(orgId)) {
      setProjects(projectsCache.get(orgId));
      setFetchError(null);
      return;
    }
    setFetchingProjects(true);
    setFetchError(null);
    try {
      const list = await fetchProjectsForOrg(orgId);
      projectsCache.set(orgId, list);
      setProjects(list);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      setFetchError(error.message || "Failed to load projects");
      setProjects([]);
    } finally {
      setFetchingProjects(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !currentOrganization?._id) {
      return;
    }
    loadProjects(currentOrganization._id);
  }, [open, currentOrganization?._id, loadProjects]);

  useEffect(() => {
    if (!open) {
      setProjectQuery("");
    }
  }, [open]);

  const handleOpenChange = (next) => {
    setOpen(next);
  };

  const close = () => setOpen(false);

  const handleSelectOrg = (orgId) => {
    switchOrganization(orgId);
    close();
  };

  const handleSelectProject = (name) => {
    switchProject(name);
    close();
  };

  const projectName = currentProject || currentOrganization?.azureDevOps?.project || null;
  const showProjectSearch = projects.length > 7;
  const filteredProjects = showProjectSearch
    ? projects.filter((p) => p.name.toLowerCase().includes(projectQuery.trim().toLowerCase()))
    : projects;

  if (loading) {
    return (
      <div className={cn("mx-2", collapsed && "mx-0 flex justify-center")}>
        <div
          className={cn(
            "flex h-12 w-full items-center gap-2 rounded-md px-2",
            collapsed && "size-8 justify-center px-0"
          )}
        >
          <Skeleton className={cn("rounded-md", collapsed ? "size-8" : "size-7")} />
          {!collapsed && (
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    const setupButton = (
      <button
        type="button"
        onClick={() => navigate("/settings?setup=true")}
        className={cn(
          "flex h-12 w-full items-center gap-2 rounded-md px-2 text-left hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring",
          collapsed && "size-8 justify-center px-0"
        )}
        aria-label="No organization. Set up"
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground",
            collapsed ? "size-8" : "size-7"
          )}
          aria-hidden
        >
          <Plus className="h-3.5 w-3.5" />
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-sidebar-foreground">
              No organization
            </span>
            <span className="block truncate text-xs text-muted-foreground">Set up</span>
          </span>
        )}
      </button>
    );

    return (
      <div className={cn("mx-2", collapsed && "mx-0 flex justify-center")}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{setupButton}</TooltipTrigger>
            <TooltipContent side="right">No organization / Set up</TooltipContent>
          </Tooltip>
        ) : (
          setupButton
        )}
      </div>
    );
  }

  const triggerButton = (
    <PopoverTrigger asChild>
      <button
        type="button"
        className={cn(
          "flex h-12 w-full items-center gap-2 rounded-md px-2 text-left",
          "hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring",
          collapsed && "size-8 justify-center px-0"
        )}
        aria-label="Switch organization or project"
      >
        <OrgAvatar name={currentOrganization.name} size={collapsed ? "lg" : "md"} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-sidebar-foreground">
                {currentOrganization.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {projectName || "Select project"}
              </span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </>
        )}
      </button>
    </PopoverTrigger>
  );

  return (
    <div className={cn("mx-2", collapsed && "mx-0 flex justify-center")}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
            <TooltipContent side="right">Org / Project</TooltipContent>
          </Tooltip>
        ) : (
          triggerButton
        )}

        <PopoverContent
          align="start"
          side={collapsed ? "right" : "bottom"}
          sideOffset={4}
          className="w-72 p-0"
        >
          <Command shouldFilter={!showProjectSearch} className="rounded-md">
            {!showProjectSearch ? (
              <CommandPrimitive.Input
                className="sr-only"
                aria-label="Filter organizations and projects"
              />
            ) : null}
            <CommandList className="max-h-[min(420px,70vh)]">
              <CommandGroup
                heading="Organizations"
                className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
              >
                {organizations.map((org) => (
                  <CommandItem
                    key={org._id}
                    value={`organization ${org.name}`}
                    onSelect={() => handleSelectOrg(org._id)}
                    className="h-9 gap-2"
                  >
                    <OrgAvatar name={org.name} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm">{org.name}</span>
                    {org.isDefault ? (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Default
                      </span>
                    ) : null}
                    {currentOrganization._id === org._id ? (
                      <Check className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup
                heading={
                  currentOrganization.name ? `Projects · ${currentOrganization.name}` : "Projects"
                }
                className="[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
              >
                {showProjectSearch ? (
                  <div className="px-2 pb-1.5 pt-0.5">
                    <Input
                      value={projectQuery}
                      onChange={(e) => setProjectQuery(e.target.value)}
                      placeholder="Find project..."
                      className="h-8 text-sm"
                      aria-label="Find project"
                    />
                  </div>
                ) : null}

                {fetchingProjects ? (
                  <div
                    className="space-y-1 px-2 py-1.5"
                    role="status"
                    aria-label="Loading projects"
                  >
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : fetchError ? (
                  <CommandItem
                    value="retry projects"
                    onSelect={() => loadProjects(currentOrganization._id, { force: true })}
                    className="h-8 gap-2 text-danger-foreground"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm">{fetchError}. Retry</span>
                  </CommandItem>
                ) : filteredProjects.length > 0 ? (
                  filteredProjects.map((project) => (
                    <CommandItem
                      key={project.id ?? project.name}
                      value={`project ${project.name}`}
                      onSelect={() => handleSelectProject(project.name)}
                      className="h-8 gap-2"
                    >
                      <Folder className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm">{project.name}</span>
                      {currentProject === project.name ? (
                        <Check className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      ) : null}
                    </CommandItem>
                  ))
                ) : (
                  <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                    No projects found
                  </div>
                )}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup>
                <CommandItem
                  value="manage organizations"
                  onSelect={() => {
                    close();
                    navigate("/settings?section=organizations");
                  }}
                  className="h-8 gap-2"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="text-sm">Manage organizations</span>
                </CommandItem>
                <CommandItem
                  value="add organization"
                  onSelect={() => {
                    close();
                    navigate("/settings?action=add-org");
                  }}
                  className="h-8 gap-2"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <span className="text-sm">Add organization</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
