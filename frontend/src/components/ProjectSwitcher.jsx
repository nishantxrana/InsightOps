import React, { useState, useEffect } from "react";
import { FolderGit2, ChevronDown, Check, RefreshCw } from "lucide-react";
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

export default function ProjectSwitcher() {
  const { currentOrganization, currentProject, switchProject, loading } = useOrganization();
  const [projects, setProjects] = useState([]);
  const [fetchingProjects, setFetchingProjects] = useState(false);

  useEffect(() => {
    if (currentOrganization) {
      fetchProjects();
    }
  }, [currentOrganization]);

  const fetchProjects = async () => {
    if (!currentOrganization) return;

    setFetchingProjects(true);
    try {
      const response = await fetch(`/api/organizations/${currentOrganization._id}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const result = await response.json();
      if (result.projects) {
        setProjects(result.projects);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setFetchingProjects(false);
    }
  };

  if (loading || !currentOrganization) {
    return null;
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 max-w-[200px]">
          <FolderGit2 className="h-4 w-4 shrink-0" />
          <span className="truncate hidden sm:inline">
            {currentProject || currentOrganization.azureDevOps?.project || "Select Project"}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
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
          >
            <RefreshCw className={`h-3 w-3 ${fetchingProjects ? "animate-spin" : ""}`} />
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {fetchingProjects ? (
          <DropdownMenuItem disabled>Loading projects...</DropdownMenuItem>
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
              {currentProject === project.name && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>No projects available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
