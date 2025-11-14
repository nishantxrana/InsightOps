import * as React from "react"
import {
  Home,
  CheckSquare,
  GitBranch,
  GitPullRequest,
  FileText,
  Settings,
} from "lucide-react"

import { DevOpsNavMain } from "@/components/DevOpsNavMain"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// Azure DevOps navigation data
const data = {
  navMain: [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: Home,
          isActive: true,
        },
      ],
    },
    {
      title: "Development",
      items: [
        {
          title: "Work Items",
          url: "/work-items",
          icon: CheckSquare,
        },
        {
          title: "Pipelines", 
          url: "/pipelines",
          icon: GitBranch,
        },
        {
          title: "Pull Requests",
          url: "/pull-requests", 
          icon: GitPullRequest,
        },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          title: "Logs",
          url: "/logs",
          icon: FileText,
        },
      ],
    },
  ],
}

export function DevOpsAppSidebar({ ...props }) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-16 items-center justify-center gap-2 px-4 group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 group-data-[collapsible=icon]:px-2 transition-[height,padding] ease-linear">
          <img 
            src="/icon.svg" 
            alt="InsightOps" 
            className="h-8 w-8 flex-shrink-0 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6 transition-[width,height] ease-linear" 
          />
          <span className="text-lg font-semibold text-foreground group-data-[collapsible=icon]:hidden transition-opacity ease-linear">
            InsightOps
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <DevOpsNavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
