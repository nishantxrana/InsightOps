import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, FolderGit2, Moon, PanelLeft, RefreshCw, Sun } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { APP_ROUTES, SETTINGS_SECTIONS } from "@/config/routes";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebar } from "@/components/ui/sidebar";

export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const { organizations, currentOrganization, currentProject, switchOrganization, switchProject } =
    useOrganization();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (!open || !currentOrganization) {
      setProjects([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/organizations/${currentOrganization._id}/projects`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const result = await response.json();
        if (!cancelled && result.projects) {
          setProjects(result.projects);
        }
      } catch {
        if (!cancelled) setProjects([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, currentOrganization]);

  const run = useCallback(
    (fn) => {
      onOpenChange(false);
      fn();
    },
    [onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search navigation, settings, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {APP_ROUTES.map((route) => {
            const Icon = route.icon;
            return (
              <CommandItem
                key={route.path}
                value={`${route.label} ${route.path}`}
                onSelect={() => run(() => navigate(route.path))}
              >
                <Icon />
                <span>{route.label}</span>
              </CommandItem>
            );
          })}
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <CommandItem
                key={section.id}
                value={`Settings ${section.label}`}
                onSelect={() => run(() => navigate(`/settings?section=${section.id}`))}
              >
                <Icon />
                <span>Settings · {section.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {(organizations.length > 0 || projects.length > 0) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Organization / Project">
              {organizations.map((org) => (
                <CommandItem
                  key={org._id}
                  value={`organization ${org.name}`}
                  onSelect={() => run(() => switchOrganization(org._id))}
                >
                  <Building2 />
                  <span>{org.name}</span>
                  {currentOrganization?._id === org._id && (
                    <span className="ml-auto text-xs text-muted-foreground">Current</span>
                  )}
                </CommandItem>
              ))}
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`project ${project.name}`}
                  onSelect={() => run(() => switchProject(project.name))}
                >
                  <FolderGit2 />
                  <span>{project.name}</span>
                  {currentProject === project.name && (
                    <span className="ml-auto text-xs text-muted-foreground">Current</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem value="Toggle theme" onSelect={() => run(() => toggleTheme())}>
            {theme === "dark" ? <Sun /> : <Moon />}
            <span>Toggle theme</span>
          </CommandItem>
          <CommandItem value="Toggle sidebar" onSelect={() => run(() => toggleSidebar())}>
            <PanelLeft />
            <span>Toggle sidebar</span>
          </CommandItem>
          <CommandItem
            value="Sync this page"
            onSelect={() =>
              run(() => {
                window.dispatchEvent(new CustomEvent("app:sync"));
              })
            }
          >
            <RefreshCw />
            <span>Sync this page</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
