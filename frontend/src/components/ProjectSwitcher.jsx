import { useState, useEffect, useCallback } from "react";
import { FolderGit2, ChevronDown, Check, RefreshCw, AlertCircle } from "lucide-react";
import { useOrganization } from "../contexts/OrganizationContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { useSidebar } from "./ui/sidebar";
import { cn } from "@/lib/utils";

export default function ProjectSwitcher() {
  const { currentOrganization, currentProject, switchProject, loading } = useOrganization();
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const [projects, setProjects] = useState([]);
  const [fetchingProjects, setFetchingProjects] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const fetchProjects = useCallback(async () => {
    if (!currentOrganization) return;

    setFetchingProjects(true);
    setFetchError(null);
    try {
      const response = await fetch(`/api/organizations/${currentOrganization._id}/projects`, {
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
      if (result.projects) {
        setProjects(result.projects);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      setFetchError(error.message || "Failed to load projects");
      setProjects([]);
    } finally {
      setFetchingProjects(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    if (currentOrganization) {
      fetchProjects();
    } else {
      setProjects([]);
      setFetchError(null);
    }
  }, [currentOrganization, fetchProjects]);

  if (loading || !currentOrganization || collapsed) {
    return null;
  }

  const displayName =
    currentProject || currentOrganization.azureDevOps?.project || "Select Project";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full justify-start gap-2 px-2 data-[state=open]:bg-muted"
          aria-label={`Project: ${displayName}`}
        >
          <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground">
            {displayName}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center justify-between">
          <span>Switch Project</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              fetchProjects();
            }}
            disabled={fetchingProjects}
            aria-label="Refresh projects"
          >
            <RefreshCw className={cn("h-3 w-3", fetchingProjects && "animate-spin")} />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {fetchingProjects ? (
          <DropdownMenuItem disabled className="gap-2 text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Loading projects…
          </DropdownMenuItem>
        ) : fetchError ? (
          <DropdownMenuItem
            className="gap-2 cursor-pointer text-danger-foreground"
            onClick={(e) => {
              e.preventDefault();
              fetchProjects();
            }}
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">{fetchError}. Retry</span>
          </DropdownMenuItem>
        ) : projects.length > 0 ? (
          projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => switchProject(project.name)}
              className="gap-2 cursor-pointer"
            >
              <FolderGit2 className="h-4 w-4" />
              <div className="flex-1 truncate">
                <div className="font-medium truncate">{project.name}</div>
              </div>
              {currentProject === project.name && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>No projects available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
