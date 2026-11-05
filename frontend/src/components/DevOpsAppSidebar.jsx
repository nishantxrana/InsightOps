import { DevOpsNavMain } from "@/components/DevOpsNavMain";
import { NavUser } from "@/components/nav-user";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { getNavGroups } from "@/config/routes";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const navGroups = getNavGroups();

export function DevOpsAppSidebar({ ...props }) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="gap-1 border-b border-sidebar-border p-2">
        <div className="flex h-10 items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <img src="/icon.svg" alt="" className="h-6 w-6 shrink-0" />
          <span className="truncate text-sm font-semibold text-foreground group-data-[collapsible=icon]:hidden">
            InsightOps
          </span>
        </div>
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Main">
          <DevOpsNavMain items={navGroups} />
        </nav>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
