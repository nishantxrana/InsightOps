import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  CheckSquare, 
  GitBranch, 
  GitPullRequest, 
  FileText, 
  Settings,
  Menu,
  X,
  Zap,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Bell,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import clsx from 'clsx'
import { useHealth } from '../contexts/HealthContext'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const navigationGroups = [
  {
    label: "Overview",
    items: [
      { name: 'Dashboard', href: '/', icon: Home }
    ]
  },
  {
    label: "Development", 
    items: [
      { name: 'Work Items', href: '/work-items', icon: CheckSquare },
      { name: 'Pipelines', href: '/pipelines', icon: GitBranch },
      { name: 'Pull Requests', href: '/pull-requests', icon: GitPullRequest }
    ]
  },
  {
    label: "Operations",
    items: [
      { name: 'Logs', href: '/logs', icon: FileText },
      { name: 'Settings', href: '/settings', icon: Settings }
    ]
  }
]

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Work Items', href: '/work-items', icon: CheckSquare },
  { name: 'Pipelines', href: '/pipelines', icon: GitBranch },
  { name: 'Pull Requests', href: '/pull-requests', icon: GitPullRequest },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Initialize from localStorage, default to false if not found
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })
  const { isConnected, isChecking, checkConnection } = useHealth()
  const location = useLocation()

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed))
  }, [sidebarCollapsed])

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={clsx(
        'fixed inset-0 z-50 lg:hidden',
        sidebarOpen ? 'block' : 'hidden'
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <img src="/icon.svg" alt="DevOps Agent" className="h-8 w-8" />
              <span className="ml-2 text-lg font-semibold text-gray-900">DevOps Agent</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                    isActive
                      ? 'bg-azure-100 text-azure-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon
                    className={clsx(
                      'mr-3 h-5 w-5',
                      isActive ? 'text-azure-500' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div 
        className={clsx(
          'hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col transition-all duration-300 ease-in-out z-30',
          sidebarCollapsed ? 'lg:w-16 hover:cursor-ew-resize' : 'lg:w-64'
        )}
      >
        <div 
          className="flex flex-col h-full bg-white border-r border-gray-200 shadow-sm relative"
          onClick={(e) => {
            if (sidebarCollapsed && e.target === e.currentTarget) {
              setSidebarCollapsed(false);
            }
          }}
        >
          {/* Top Section - Logo + Toggle */}
          <div className={clsx(
            'flex items-center h-16 border-b border-gray-100 transition-all duration-300 relative z-30',
            sidebarCollapsed ? 'justify-center px-2 group' : 'justify-between px-4'
          )}>
            {sidebarCollapsed ? (
              // Collapsed state: Logo with hover reveal of expand icon
              <div className="relative">
                <img src="/icon.svg" alt="DevOps Agent" className="h-8 w-8 flex-shrink-0" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out cursor-pointer flex items-center justify-center bg-white/90 rounded-md"
                    >
                      <PanelLeftOpen className="h-8 w-8 text-gray-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Expand sidebar</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              // Expanded state: Logo on left, toggle on right
              <>
                <div className="flex items-center">
                  <img src="/icon.svg" alt="DevOps Agent" className="h-8 w-8 flex-shrink-0" />
                </div>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                      className="p-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors"
                    >
                      <PanelLeftClose className="h-8 w-8 text-gray-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Collapse sidebar</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* Middle Section - Navigation */}
          <nav className="flex-1 py-4 overflow-y-auto relative z-30">
            {sidebarCollapsed && (
              <div 
                className="absolute inset-0 cursor-ew-resize z-20"
                onClick={() => setSidebarCollapsed(false)}
              />
            )}
            {navigationGroups.map((group, groupIndex) => (
              <div key={group.label} className={clsx(
                groupIndex > 0 && "mt-6"
              )}>
                {!sidebarCollapsed && (
                  <div className="px-4 mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {group.label}
                    </h3>
                  </div>
                )}
                
                <div className={clsx(
                  "space-y-1 relative",
                  sidebarCollapsed ? "px-2" : "px-2"
                )}>
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.href
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          <Button
                            asChild
                            variant={isActive ? "secondary" : "ghost"}
                            className={clsx(
                              "w-full transition-all duration-200 relative z-[60] cursor-pointer",
                              sidebarCollapsed ? "justify-center px-2 py-3" : "justify-start px-2 py-2",
                              isActive 
                                ? "bg-blue-50 text-blue-900 hover:bg-blue-100" 
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link to={item.href} className="cursor-pointer flex items-center w-full">
                              <Icon className={clsx(
                                "h-5 w-5 flex-shrink-0 cursor-pointer",
                                sidebarCollapsed ? "mr-0" : "mr-3",
                                isActive ? "text-blue-600" : "text-gray-400"
                              )} />
                              {!sidebarCollapsed && (
                                <span className="whitespace-nowrap overflow-hidden cursor-pointer">{item.name}</span>
                              )}
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        {sidebarCollapsed && (
                          <TooltipContent side="right">
                            <p>{item.name}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    )
                  })}
                </div>
                
                {!sidebarCollapsed && groupIndex < navigationGroups.length - 1 && (
                  <div className="px-4 mt-4">
                    <Separator />
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Bottom Section - User Profile */}
          <div className="border-t border-gray-100 p-3 relative z-30">
            {sidebarCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <Avatar className="h-8 w-8 cursor-pointer">
                      <AvatarFallback className="bg-blue-600 text-white text-sm">
                        A
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Admin User</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-600 text-white text-sm">
                    A
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">Admin User</div>
                  <div className="text-xs text-gray-500 truncate">admin@company.com</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={clsx(
        'transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
      )}>
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            {/* Left Section - Breadcrumbs */}
            <div className="flex flex-1 items-center">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/" className="flex items-center gap-1">
                        <Home className="h-4 w-4" />
                        Home
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-semibold">
                      {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Right Section - Status */}
            <div className="flex items-center">
              {/* Live/Offline Indicator with Tooltip */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    onClick={checkConnection}
                    className={clsx(
                      "w-2 h-2 rounded-full cursor-pointer transition-all duration-300",
                      isChecking 
                        ? "bg-blue-500 animate-pulse" 
                        : isConnected 
                          ? "bg-emerald-500" 
                          : "bg-red-500"
                    )}
                  />
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
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
    </TooltipProvider>
  )
}
