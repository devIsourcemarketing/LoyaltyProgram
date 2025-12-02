import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Menu, X, Globe, Database, Settings } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { AuthUser } from "@/lib/auth";
import kasperskyLogo from "@/assets/logo-kaspersky-cup.png";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { isAdminRole } from "@/lib/roles";

interface NavigationProps {
  user: AuthUser;
}

export default function Navigation({ user }: NavigationProps) {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get current admin tab from URL and update on location change
  const [currentTab, setCurrentTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'overview';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCurrentTab(params.get('tab') || 'overview');
  }, [location]);

  const handleTabChange = (tab: string) => {
    const newUrl = `/admin?tab=${tab}`;
    window.history.pushState({}, '', newUrl);
    setCurrentTab(tab);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };


  // Improved safety check - show loading state instead of null
  if (!user || !user.id) {
    return (
      <header className="bg-white shadow-md fixed top-0 left-0 right-0 z-[9999] w-full">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <img 
                  src={kasperskyLogo} 
                  alt="Kaspersky Cup" 
                  className="h-10 w-auto" 
                />
              </div>
              <div className="animate-pulse bg-white/30 h-4 w-32 rounded"></div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="animate-pulse bg-white/30 h-8 w-24 rounded"></div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear all queries from cache
      queryClient.clear();
      toast({
        title: t("common.success"),
        description: "Logged out successfully",
      });
      // Immediate redirect to login page - remove timeout
      setLocation("/login");
    },
    onError: () => {
      // Even if logout fails, redirect to login
      queryClient.clear();
      setLocation("/login");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = isAdminRole(user.role) 
    ? [
        { href: "/admin", label: t("admin.panel"), current: location === "/admin" },
      ]
    : [
        { href: "/", label: t("common.dashboard"), current: location === "/" },
        { href: "/rewards", label: t("common.rewards"), current: location === "/rewards" },
        { href: "/deals", label: t("common.termsAndConditions"), current: location === "/deals" },
      ];

  const userInitials = `${user.firstName?.charAt(0) || 'U'}${user.lastName?.charAt(0) || 'U'}`.toUpperCase();

  return (
    <header className="bg-white shadow-md fixed top-0 left-0 right-0 z-[9999] w-full" style={{ display: 'block', visibility: 'visible' }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex justify-between items-center h-14">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 overflow-hidden">
            <div className="flex-shrink-0">
              <Link href="/">
                <img 
                  src={kasperskyLogo} 
                  alt="Kaspersky Cup" 
                  className="h-10 sm:h-12 w-auto cursor-pointer" 
                  data-testid="logo"
                />
              </Link>
            </div>
            {isAdminRole(user.role) ? (
              <>
                <div className="bg-[#9DFFEF] px-2 sm:px-3 py-1 sm:py-1.5 rounded-md whitespace-nowrap flex-shrink-0">
                  <span className="text-xs sm:text-sm font-medium text-[#1D1D1B]">{t('admin.panel')}</span>
                </div>
                <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
                  <div className="flex items-baseline space-x-0.5 sm:space-x-1 bg-white p-0.5 sm:p-1 rounded-lg border border-gray-200">
                    <button 
                      onClick={() => handleTabChange('overview')}
                      className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${
                        currentTab === 'overview' 
                          ? 'bg-[#29CCB1] text-white' 
                          : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'
                      }`}>
                      {t('admin.overview')}
                    </button>
                    <button 
                      onClick={() => handleTabChange('invitations')}
                      className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${
                        currentTab === 'invitations' 
                          ? 'bg-[#29CCB1] text-white' 
                          : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'
                      }`}>
                      {t('admin.invitations')}
                    </button>
                    <button 
                      onClick={() => handleTabChange('users')}
                      className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${
                        currentTab === 'users' 
                          ? 'bg-[#29CCB1] text-white' 
                          : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'
                      }`}>
                      {t('admin.users')}
                    </button>
                    <button 
                      onClick={() => handleTabChange('deals')}
                      className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${
                        currentTab === 'deals' 
                          ? 'bg-[#29CCB1] text-white' 
                          : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'
                      }`}>
                      {t('admin.deals')}
                    </button>
                    <button 
                      onClick={() => handleTabChange('rewards')}
                      className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${
                        currentTab === 'rewards' 
                          ? 'bg-[#29CCB1] text-white' 
                          : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'
                      }`}>
                      {t('admin.rewards')}
                    </button>
                    <button 
                      onClick={() => handleTabChange('regions')}
                      className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${
                        currentTab === 'regions' 
                          ? 'bg-[#29CCB1] text-white' 
                          : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'
                      }`}>
                      <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-0.5 sm:mr-1" />
                      <span className="hidden sm:inline">{t('admin.regions')}</span>
                    </button>
                    {user.role === 'super-admin' && (
                      <button 
                        onClick={() => handleTabChange('masters')}
                        className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${
                          currentTab === 'masters' 
                            ? 'bg-[#29CCB1] text-white' 
                            : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'
                        }`}>
                        <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-0.5 sm:mr-1" />
                        <span className="hidden sm:inline">{t('admin.masters')}</span>
                      </button>
                    )}
                    <button 
                      onClick={() => handleTabChange('settings')}
                      className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-[10px] sm:text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${
                        currentTab === 'settings' 
                          ? 'bg-[#29CCB1] text-white' 
                          : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'
                      }`}>
                      <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5 inline mr-0.5 sm:mr-1" />
                      <span className="hidden sm:inline">{t('admin.settings')}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <button
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          item.current
                            ? "text-blue-600 bg-blue-50 text-green-600 green-background-opacity15"
                            : "text-gray-700 hover:text-green-600"
                        }`}
                        data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                      >
                        {item.label}
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right side - Language, Notifications, User Menu */}
          <div className="flex items-center space-x-3">
            {/* Language Selector */}
            <LanguageSelector />

            {/* Notifications */}
            <NotificationBell userId={user.id} />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1 sm:space-x-2 text-[#1D1D1B] hover:bg-gray-100 h-9 px-2 sm:px-3" data-testid="button-user-menu">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600 green-background white-text text-xs sm:text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:block text-left">
                    <div className="text-sm font-medium text-[#1D1D1B] truncate max-w-[150px]" data-testid="text-user-name">
                      {user.role === 'regional-admin' || user.role === 'admin' ? `${user.role === 'admin' ? 'Admin' : 'Sales'} ${user.lastName || user.firstName}` : `${user.firstName} ${user.lastName}`}
                    </div>
                  </div>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-[#1D1D1B]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <Link href="/profile">
                  <DropdownMenuItem data-testid="menu-profile">
                    {t("common.profile")}
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                  {t("common.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-[#1D1D1B] hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-50 border-t">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                      item.current
                        ? "text-white bg-[#29CCB1]"
                        : "text-[#1D1D1B] hover:text-white hover:bg-[#29CCB1]"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid={`mobile-nav-${item.label.toLowerCase().replace(" ", "-")}`}
                  >
                    {item.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
