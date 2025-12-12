import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Gift,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Globe
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useQuery } from "@tanstack/react-query";

interface SidebarProps {
  className?: string;
}

interface CurrentUser {
  id: number;
  email: string;
  username: string;
  role: "user" | "admin" | "regional-admin" | "super-admin";
  adminRegionId?: string | null;
  regionInfo?: {
    id: string;
    name: string;
    region: string;
    category: string;
    subcategory: string;
  } | null;
}

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  descriptionKey?: string;
}

const adminNavItems: NavItem[] = [
  {
    href: "/admin",
    labelKey: "admin.overview",
    icon: LayoutDashboard,
    descriptionKey: "admin.dashboardAnalytics"
  },
  {
    href: "/admin/users",
    labelKey: "admin.users",
    icon: Users,
    descriptionKey: "admin.manageUserAccounts"
  },
  {
    href: "/admin/deals",
    labelKey: "admin.deals",
    icon: ClipboardCheck,
    descriptionKey: "admin.approveDeals"
  },
  {
    href: "/admin/rewards",
    labelKey: "admin.rewards",
    icon: Gift,
    descriptionKey: "admin.manageRewardCatalog"
  },
  {
    href: "/admin/reports",
    labelKey: "admin.reports",
    icon: BarChart3,
    descriptionKey: "admin.generateAnalytics"
  },
];

export default function Sidebar({ className }: SidebarProps) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Obtener información del usuario actual
  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["/api/auth/me"],
  });

  return (
    <div
      className={cn(
        "relative flex h-screen flex-col border-r bg-white shadow-sm transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">LP</span>
            </div>
            <span className="font-semibold text-gray-900">{t('admin.panel')}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
          data-testid="button-toggle-sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Region Indicator */}
      {currentUser && (currentUser.role === "regional-admin" || currentUser.role === "super-admin") && !isCollapsed && (
        <div className="px-3 py-2 border-b bg-gray-50">
          <div className="flex items-center gap-2 text-xs">
            {currentUser.role === "super-admin" ? (
              <>
                <Globe className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-gray-700">{t('common.allRegionsLabel')}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{t('common.superAdmin')}</Badge>
              </>
            ) : currentUser.regionInfo ? (
              <>
                <MapPin className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <div className="font-medium text-gray-700">{currentUser.regionInfo.region}</div>
                  <div className="text-gray-500">{currentUser.regionInfo.category} - {currentUser.regionInfo.subcategory || currentUser.regionInfo.name}</div>
                </div>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-gray-700">{t("auth.regionNotAssigned")}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || 
            (item.href !== "/admin" && location.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-12",
                  isCollapsed ? "px-2" : "px-3",
                  isActive && "bg-primary-600 text-white hover:bg-primary-700",
                  !isActive && "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                )}
                data-testid={`nav-${t(item.labelKey).toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
                {!isCollapsed && (
                  <div className="text-left">
                    <div className="font-medium">{t(item.labelKey)}</div>
                    {item.descriptionKey && (
                      <div className="text-xs opacity-75">{t(item.descriptionKey)}</div>
                    )}
                  </div>
                )}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t">
        <Link href="/admin/settings">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-12",
              isCollapsed ? "px-2" : "px-3",
              "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            )}
            data-testid="nav-settings"
          >
            <Settings className={cn("h-5 w-5", isCollapsed ? "" : "mr-3")} />
            {!isCollapsed && (
              <div className="text-left">
                <div className="font-medium">{t('admin.settings')}</div>
                <div className="text-xs opacity-75">{t('admin.systemConfiguration')}</div>
              </div>
            )}
          </Button>
        </Link>
      </div>
    </div>
  );
}