import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function userInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function NavUser() {
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, logout } = useAuth();
  const location = useLocation();
  const onSettings = location.pathname.startsWith("/settings");

  const handleSettingsClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const userData = {
    name: user?.name || "User",
    email: user?.email || "",
    avatar: user?.avatar || "",
  };

  const initials = userInitials(user?.name);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                onSettings && "bg-sidebar-accent text-sidebar-accent-foreground"
              )}
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={userData.avatar} alt="" />
                <AvatarFallback className="rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{userData.name}</span>
                <span className="truncate text-xs text-muted-foreground">{userData.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-md p-1"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                <Avatar className="h-10 w-10 rounded-lg">
                  <AvatarImage src={userData.avatar} alt="" />
                  <AvatarFallback className="rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{userData.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{userData.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="h-8 gap-2 px-2 text-sm">
              <Link
                to="/settings"
                onClick={handleSettingsClick}
                aria-current={onSettings ? "page" : undefined}
              >
                <Settings className="size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={logout}
              className="h-8 gap-2 px-2 text-sm hover:!text-danger-foreground"
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
