import { Link, useLocation } from "react-router-dom"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function DevOpsNavMain({ items }) {
  const location = useLocation()

  const getPageColors = (url) => {
    switch (url) {
      case '/':
        return {
          activeBg: 'bg-blue-50 dark:bg-blue-950/50',
          activeText: 'text-blue-700 dark:text-blue-300', 
          activeIcon: 'text-blue-600 dark:text-blue-400'
        }
      case '/work-items':
        return {
          activeBg: 'bg-yellow-50 dark:bg-yellow-950/50',
          activeText: 'text-yellow-700 dark:text-yellow-300',
          activeIcon: 'text-yellow-600 dark:text-yellow-400'
        }
      case '/pipelines':
        return {
          activeBg: 'bg-purple-50 dark:bg-purple-950/50',
          activeText: 'text-purple-700 dark:text-purple-300',
          activeIcon: 'text-purple-600 dark:text-purple-400'
        }
      case '/pull-requests':
        return {
          activeBg: 'bg-emerald-50 dark:bg-emerald-950/50',
          activeText: 'text-emerald-700 dark:text-emerald-300',
          activeIcon: 'text-emerald-600 dark:text-emerald-400'
        }
      case '/logs':
        return {
          activeBg: 'bg-indigo-50 dark:bg-indigo-950/50',
          activeText: 'text-indigo-700 dark:text-indigo-300',
          activeIcon: 'text-indigo-600 dark:text-indigo-400'
        }
      default:
        return {
          activeBg: 'bg-accent',
          activeText: 'text-accent-foreground', 
          activeIcon: 'text-muted-foreground'
        }
    }
  }

  return (
    <>
      {items.map((group) => (
        <SidebarGroup key={group.title}>
          <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items?.map((item) => {
              const isActive = location.pathname === item.url
              const colors = getPageColors(item.url)
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={item.title}
                    className={`
                      transition-all duration-200 [&:hover_svg]:text-current
                      ${isActive 
                        ? `${colors.activeBg} ${colors.activeText} hover:${colors.activeBg} hover:${colors.activeText}` 
                        : `text-muted-foreground hover:text-foreground hover:${colors.activeBg} hover:${colors.activeText}`
                      }
                    `}
                  >
                    <Link to={item.url}>
                      {item.icon && (
                        <item.icon className={`h-4 w-4 transition-colors ${
                          isActive 
                            ? colors.activeIcon 
                            : 'text-muted-foreground'
                        }`} />
                      )}
                      <span className="font-medium group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
