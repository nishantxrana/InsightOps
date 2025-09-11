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
          activeBg: 'bg-blue-50',
          activeText: 'text-blue-700', 
          activeIcon: 'text-blue-600'
        }
      case '/work-items':
        return {
          activeBg: 'bg-yellow-50',
          activeText: 'text-yellow-700',
          activeIcon: 'text-yellow-600'
        }
      case '/pipelines':
        return {
          activeBg: 'bg-purple-50',
          activeText: 'text-purple-700',
          activeIcon: 'text-purple-600'
        }
      case '/pull-requests':
        return {
          activeBg: 'bg-emerald-50',
          activeText: 'text-emerald-700',
          activeIcon: 'text-emerald-600'
        }
      case '/logs':
        return {
          activeBg: 'bg-indigo-50',
          activeText: 'text-indigo-700',
          activeIcon: 'text-indigo-600'
        }
      default:
        return {
          activeBg: 'bg-gray-100',
          activeText: 'text-gray-900', 
          activeIcon: 'text-gray-600'
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
                        : `text-gray-600 hover:${colors.activeBg.replace('bg-', 'bg-')} hover:${colors.activeText.replace('text-', 'text-')}`
                      }
                    `}
                  >
                    <Link to={item.url}>
                      {item.icon && (
                        <item.icon className={`h-4 w-4 transition-colors ${
                          isActive 
                            ? colors.activeIcon 
                            : 'text-gray-500'
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
