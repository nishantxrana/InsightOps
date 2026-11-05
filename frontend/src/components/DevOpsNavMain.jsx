import { Link, useLocation } from "react-router-dom";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { isRouteActive } from "@/config/routes";
import { cn } from "@/lib/utils";

export function DevOpsNavMain({ items }) {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
    window.scrollTo(0, 0);
  };

  return (
    <>
      {items.map((group) => (
        <SidebarGroup key={group.title}>
          <SidebarGroupLabel className="h-7 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {group.title}
          </SidebarGroupLabel>
          <SidebarMenu>
            {group.items?.map((item) => {
              const isActive = isRouteActive(location.pathname, item.url);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive}
                    className={cn(
                      "h-8 relative",
                      isActive &&
                        "bg-muted text-foreground data-[active=true]:bg-muted before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-primary"
                    )}
                  >
                    <Link
                      to={item.url}
                      onClick={handleNavClick}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.icon && <item.icon className="size-4 stroke-[1.5]" aria-hidden />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
