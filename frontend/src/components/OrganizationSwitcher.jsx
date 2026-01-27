import React from "react";
import { Building2, ChevronDown, Check, Plus, Settings } from "lucide-react";
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

export default function OrganizationSwitcher() {
  const { organizations, currentOrganization, switchOrganization, loading } = useOrganization();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-2">
        <Building2 className="h-4 w-4" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    );
  }

  if (!currentOrganization) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/settings")}>
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Add Organization</span>
      </Button>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 max-w-[200px]">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate hidden sm:inline">{currentOrganization.name}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
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
            <Building2 className="h-4 w-4" />
            <div className="flex-1 truncate">
              <div className="font-medium truncate">{org.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {org.azureDevOps?.organization}/{org.azureDevOps?.project}
              </div>
            </div>
            {currentOrganization._id === org._id && <Check className="h-4 w-4 text-primary" />}
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
