import { ChevronDown, Check, Plus, Settings } from "lucide-react";
import { useOrganization } from "../contexts/OrganizationContext";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useSidebar } from "./ui/sidebar";
import { cn } from "@/lib/utils";

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

function OrgAvatar({ name, className }) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground",
        className
      )}
      aria-hidden
    >
      {orgInitials(name)}
    </span>
  );
}

export default function OrganizationSwitcher() {
  const { organizations, currentOrganization, switchOrganization, loading } = useOrganization();
  const navigate = useNavigate();
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  if (loading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        className={cn(
          "h-8 w-full justify-start gap-2 px-2",
          collapsed && "size-8 justify-center px-0"
        )}
      >
        <OrgAvatar name="…" />
        {!collapsed && <span className="truncate text-sm text-muted-foreground">Loading…</span>}
      </Button>
    );
  }

  if (!currentOrganization) {
    const addButton = (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-full justify-start gap-2 px-2",
          collapsed && "size-8 justify-center px-0"
        )}
        onClick={() => navigate("/settings")}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Plus className="h-3.5 w-3.5" />
        </span>
        {!collapsed && <span className="truncate text-sm">Add Organization</span>}
      </Button>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{addButton}</TooltipTrigger>
          <TooltipContent side="right">Add Organization</TooltipContent>
        </Tooltip>
      );
    }
    return addButton;
  }

  const trigger = (
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-full justify-start gap-2 px-2 data-[state=open]:bg-muted",
          collapsed && "size-8 justify-center px-0"
        )}
        aria-label={`Organization: ${currentOrganization.name}`}
      >
        <OrgAvatar name={currentOrganization.name} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-sm font-medium">
              {currentOrganization.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </>
        )}
      </Button>
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu modal={false}>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right">{currentOrganization.name}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <DropdownMenuContent
        align="start"
        side={collapsed ? "right" : "bottom"}
        className="w-[240px]"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Switch Organization
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {organizations.map((org) => (
          <DropdownMenuItem
            key={org._id}
            onClick={() => switchOrganization(org._id)}
            className="gap-2 cursor-pointer"
          >
            <OrgAvatar name={org.name} />
            <div className="flex-1 truncate">
              <div className="font-medium truncate">{org.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {org.azureDevOps?.organization}/{org.azureDevOps?.project}
              </div>
            </div>
            {currentOrganization._id === org._id && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2 cursor-pointer">
          <Settings className="h-4 w-4" />
          <span>Manage Organizations</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate("/settings?action=add-org")}
          className="gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
