import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useHealth } from '../contexts/HealthContext'
import { DevOpsAppSidebar } from './DevOpsAppSidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const breadcrumbMap = {
  '/': 'Dashboard',
  '/work-items': 'Work Items',
  '/pipelines': 'Pipelines', 
  '/pull-requests': 'Pull Requests',
  '/logs': 'Logs',
  '/settings': 'Settings'
}

export default function Layout({ children }) {
  const location = useLocation()
  const { isConnected, isChecking, checkConnection } = useHealth()

  const currentPageName = breadcrumbMap[location.pathname] || 'Page'

  return (
    <TooltipProvider>
      <SidebarProvider>
        <DevOpsAppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/">
                      Agent
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentPageName}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            
            {/* Right Section - Status */}
            <div className="ml-auto flex items-center gap-2 px-10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    onClick={checkConnection}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      isChecking 
                        ? "bg-blue-500 animate-pulse" 
                        : isConnected 
                          ? "bg-emerald-500" 
                          : "bg-red-500"
                    }`} />
                    <span className={`text-xs font-medium transition-colors duration-300 ${
                      isChecking 
                        ? "text-blue-600" 
                        : isConnected 
                          ? "text-emerald-600" 
                          : "text-red-600"
                    }`}>
                      {isChecking ? "Sync" : isConnected ? "Live" : "Offline"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">
                    {isChecking 
                      ? "Syncing with Azure DevOps..." 
                      : isConnected 
                        ? "Connected to Azure DevOps - Click to refresh" 
                        : "Disconnected from Azure DevOps - Click to retry"
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0 max-w-full overflow-hidden">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
