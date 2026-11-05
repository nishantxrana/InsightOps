import { Link, useLocation } from "react-router-dom";
import { DevOpsNavMain } from "@/components/DevOpsNavMain";
import { NavUser } from "@/components/nav-user";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import ProjectSwitcher from "@/components/ProjectSwitcher";
import { getNavGroups, SETTINGS_ROUTE, isRouteActive } from "@/config/routes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navGroups = getNavGroups();

export function DevOpsAppSidebar({ ...props }) {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const settingsActive = isRouteActive(location.pathname, SETTINGS_ROUTE.path);
  const SettingsIcon = SETTINGS_ROUTE.icon;

  const handleSettingsClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    window.scrollTo(0, 0);
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="gap-1 border-b border-sidebar-border p-2">
        <div className="flex h-10 items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <img src="/icon.svg" alt="" className="h-6 w-6 shrink-0" />
          <span className="truncate text-sm font-semibold text-foreground group-data-[collapsible=icon]:hidden">
            InsightOps
          </span>
        </div>
        <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:items-center">
          <OrganizationSwitcher />
          <div className="group-data-[collapsible=icon]:hidden">
            <ProjectSwitcher />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Main">
          <DevOpsNavMain items={navGroups} />
        </nav>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border gap-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={SETTINGS_ROUTE.label}
              isActive={settingsActive}
              className={cn(
                "h-8 relative",
                settingsActive &&
                  "bg-muted text-foreground data-[active=true]:bg-muted before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-primary"
              )}
            >
              <Link
                to={SETTINGS_ROUTE.path}
                onClick={handleSettingsClick}
                aria-current={settingsActive ? "page" : undefined}
              >
                <SettingsIcon className="size-4 stroke-[1.5]" aria-hidden />
                <span>{SETTINGS_ROUTE.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
