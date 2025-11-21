import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { AuthUser } from "@/lib/auth";
import logo from "@assets/logo.png";
import { NotificationBell } from "@/components/NotificationBell";
import { isAdminRole } from "@/lib/roles";

interface NavigationProps {
  user: AuthUser;
}

export default function Navigation({ user }: NavigationProps) {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, currentLanguage, changeLanguage } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();


  // Improved safety check - show loading state instead of null
  if (!user || !user.id) {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-[9999] w-full min-h-[64px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <img 
                  src={logo} 
                  alt="LoyaltyPro" 
                  className="h-8 w-auto logo-toolbar" 
                />
              </div>
              <div className="animate-pulse bg-gray-200 h-4 w-32 rounded"></div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
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

  const handleLanguageChange = (lang: string) => {
    changeLanguage(lang as any);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = isAdminRole(user.role) 
    ? [
        { href: "/admin", label: t("admin.panel"), current: location === "/admin" },
      ]
    : [
        { href: "/", label: t("common.dashboard"), current: location === "/" },
        { href: "/deals", label: t("common.deals"), current: location === "/deals" },
        { href: "/rewards", label: t("common.rewards"), current: location === "/rewards" },
      ];

  const userInitials = `${user.firstName?.charAt(0) || 'U'}${user.lastName?.charAt(0) || 'U'}`.toUpperCase();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-[9999] w-full min-h-[64px]" style={{ display: 'block', visibility: 'visible' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Link href="/">
                <img 
                  src={logo} 
                  alt="LoyaltyPro" 
                  className="h-8 w-auto cursor-pointer" 
                  data-testid="logo"
                />
              </Link>
            </div>
            
            {/* Desktop Navigation */}
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
          </div>

          {/* Right side - Language, Notifications, User Menu */}
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <Select value={currentLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="w-auto border-gray-300" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
              </SelectContent>
            </Select>

            {/* Notifications */}
            <NotificationBell userId={user.id} />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2" data-testid="button-user-menu">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-600 green-background white-text">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900" data-testid="text-user-name">
                      {user.firstName} {user.lastName}
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <Link href="/profile">
                  <DropdownMenuItem data-testid="menu-profile">
                    {t("common.profile")}
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem data-testid="menu-settings">Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                  {t("common.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left ${
                      item.current
                        ? "text-blue-600 bg-blue-50"
                        : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
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
