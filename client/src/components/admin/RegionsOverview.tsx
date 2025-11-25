import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Globe, Target, TrendingUp, Users, Calendar, Infinity, Flag, MapPin, Award, Medal, Trophy, Activity, Settings, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

interface RegionConfig {
  id: string;
  region: string;
  category: string;
  subcategory: string | null;
  name: string;
  newCustomerGoalRate: number;
  renewalGoalRate: number;
  monthlyGoalTarget: number;
  isActive: boolean;
  expirationDate: string | null;
}

interface RegionStats {
  totalUsers: number;
  activeDeals: number;
  totalGoals: number;
  monthlyProgress: number;
}

export default function RegionsOverview() {
  const { t } = useTranslation();
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Get current user to determine role and region
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: regions, isLoading: regionsLoading } = useQuery<RegionConfig[]>({
    queryKey: ["/api/admin/regions"],
  });

  // Get support tickets count by region
  const { data: supportTicketsData } = useQuery({
    queryKey: ["/api/admin/support-tickets"],
    queryFn: async () => {
      const response = await fetch("/api/admin/support-tickets", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch support tickets");
      return response.json();
    },
  });

  // Get points configuration
  const { data: pointsConfigData } = useQuery({
    queryKey: ["/api/admin/points-config"],
    queryFn: async () => {
      const response = await fetch("/api/admin/points-config", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch points config");
      return response.json();
    },
  });

  // Get region statistics
  const { data: regionStats, refetch: refetchRegionStats } = useQuery({
    queryKey: ["/api/admin/region-stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/region-stats", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch region stats");
      return response.json();
    },
    staleTime: 0, // Force fresh data
    refetchOnMount: true, // Always refetch on mount
  });

  // Get campaigns count by region
  const { data: campaignsData } = useQuery({
    queryKey: ["/api/admin/campaigns"],
    queryFn: async () => {
      const response = await fetch("/api/admin/campaigns", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      return response.json();
    },
  });

  // Get deals count by region
  const { data: dealsData } = useQuery({
    queryKey: ["/api/deals"],
    queryFn: async () => {
      const response = await fetch("/api/deals", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch deals");
      return response.json();
    },
  });

  // Get monthly prizes count by region
  const { data: monthlyPrizesData } = useQuery({
    queryKey: ["/api/admin/monthly-prizes"],
    queryFn: async () => {
      const response = await fetch("/api/admin/monthly-prizes", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch monthly prizes");
      return response.json();
    },
  });

  // Group regions by main region
  const groupedRegions = regions?.reduce((acc, region) => {
    if (!acc[region.region]) {
      acc[region.region] = [];
    }
    acc[region.region].push(region);
    return acc;
  }, {} as Record<string, RegionConfig[]>);

  // Determinar si es administrador regional y su región
  const isRegionalAdmin = currentUser && (currentUser as any).role === "regional-admin";
  
  // Para regional-admin, usar regionInfo.region si está disponible
  const userRegion = isRegionalAdmin 
    ? ((currentUser as any).regionInfo?.region || (currentUser as any).region)
    : null;

  // Filtrar regiones según el rol del usuario
  const displayRegions = groupedRegions 
    ? (isRegionalAdmin && userRegion 
        ? Object.entries(groupedRegions).filter(([regionName]) => regionName === userRegion)
        : Object.entries(groupedRegions))
    : [];

  const getRegionColor = (region: string) => {
    const colors = {
      NOLA: "from-[#4169E1] to-[#2E5FD6]",
      SOLA: "from-[#00BFA5] to-[#00A88E]", 
      BRASIL: "from-[#FF9800] to-[#F57C00]",
      MEXICO: "from-[#E53935] to-[#C62828]",
    };
    return colors[region as keyof typeof colors] || "from-[#7B1FA2] to-[#6A1B9A]";
  };

  const getRegionIconColor = (region: string) => {
    const colors = {
      NOLA: "text-[#4169E1]",
      SOLA: "text-[#00BFA5]",
      BRASIL: "text-[#FF9800]",
      MEXICO: "text-[#E53935]",
    };
    return colors[region as keyof typeof colors] || "text-[#7B1FA2]";
  };

  const getRegionBgColor = (region: string) => {
    const colors = {
      NOLA: "bg-[#E3F2FD]",
      SOLA: "bg-[#E0F2F1]",
      BRASIL: "bg-[#FFF3E0]",
      MEXICO: "bg-[#FFEBEE]",
    };
    return colors[region as keyof typeof colors] || "bg-[#F3E5F5]";
  };

  const getRegionFlag = (region: string) => {
    // Use real flag images from flagcdn.com like in the original implementation
    const flagIcons: Record<string, JSX.Element> = {
      NOLA: (
        <div className="relative h-8 w-12 flex items-center justify-center bg-blue-100 rounded shadow-md">
          <Globe className="h-5 w-5 text-blue-600" />
        </div>
      ),
      SOLA: (
        <div className="relative h-8 w-12 flex items-center justify-center bg-green-100 rounded shadow-md">
          <Globe className="h-5 w-5 text-green-600" />
        </div>
      ),
      BRASIL: <img src="https://flagcdn.com/w80/br.png" alt="Brasil" className="h-8 w-12 rounded object-cover shadow-md" />,
      MEXICO: <img src="https://flagcdn.com/w80/mx.png" alt="México" className="h-8 w-12 rounded object-cover shadow-md" />,
    };
    return flagIcons[region] || <Globe className="h-6 w-6" />;
  };

  const getCountryFlag = (subcategory: string | null) => {
    if (!subcategory) return null;
    const countryIcons: Record<string, JSX.Element> = {
      COLOMBIA: <img src="https://flagcdn.com/w20/co.png" alt="Colombia" className="h-3 w-4 rounded" />,
      "CENTRO AMÉRICA": (
        <div className="relative h-3 w-4 flex items-center justify-center bg-blue-50 rounded">
          <MapPin className="h-2.5 w-2.5 text-blue-600" />
        </div>
      ),
      PLATINUM: <Trophy className="h-4 w-4 text-yellow-500" />,
      GOLD: <Award className="h-4 w-4 text-yellow-600" />,
      "SILVER & REGISTERED": <Medal className="h-4 w-4 text-gray-400" />,
    };
    return countryIcons[subcategory] || null;
  };

  const getRegionStats = (region: string) => {
    // Get stats from the regionStats endpoint (which has proper regional filtering)
    const regionData = regionStats?.find((stat: any) => stat.region === region);
    
    if (regionData) {
      // Use the pre-calculated stats from the backend
      const currentRegionConfigs = groupedRegions?.[region] || [];
      
      return {
        deals: regionData.total_deals || 0,
        campaigns: 0, // Will be updated when campaigns endpoint is also filtered
        monthlyPrizes: 0, // Will be updated when monthly prizes endpoint is also filtered  
        supportTickets: 0, // Will be updated when support tickets endpoint is also filtered
        totalUsers: regionData.total_users || 0,
        activeUsers: regionData.active_users || 0,
        totalGoals: regionData.total_goals || 0,
        activeConfigs: currentRegionConfigs.length || 0,
        pointsConfigs: 0 // Will be calculated separately
      };
    }
    
    // Fallback to old logic if regionStats not available
    const regionDeals = dealsData?.filter((deal: any) => deal.region === region)?.length || 0;
    
    // Count campaigns for this region  
    const regionCampaigns = campaignsData?.filter((campaign: any) => campaign.region === region)?.length || 0;
    
    // Count monthly prizes for this region
    const regionMonthlyPrizes = monthlyPrizesData?.filter((prize: any) => prize.region === region)?.length || 0;
    
    // Count support tickets for this region
    const regionSupportTickets = supportTicketsData?.filter((ticket: any) => {
      // Los tickets de soporte pueden estar asociados a usuarios de esta región
      return ticket.userRegion === region || ticket.region === region;
    })?.length || 0;
    
    // Count active users in this region
    const regionUsers = regionStats?.find((stat: any) => stat.region === region);
    const totalUsers = regionUsers?.total_users || 0;
    const activeUsers = regionUsers?.active_users || 0;
    
    // Points configuration for this region
    const regionPointsConfig = pointsConfigData?.filter((config: any) => config.region === region)?.length || 0;
    
    // Get total goals/objectives for this region from region configurations
    const regionConfigs = groupedRegions?.[region] || [];
    const totalGoals = regionConfigs.reduce((acc: number, config: any) => acc + (config.monthlyGoalTarget || 0), 0);
    const activeConfigs = regionConfigs.filter((config: any) => config.isActive).length;
    
    return {
      deals: regionDeals,
      campaigns: regionCampaigns,
      monthlyPrizes: regionMonthlyPrizes,
      supportTickets: regionSupportTickets,
      totalUsers,
      activeUsers,
      totalGoals,
      activeConfigs,
      pointsConfigs: regionPointsConfig
    };
  };

  if (regionsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {isRegionalAdmin ? `${t('admin.regionsConfigured')} - ${userRegion}` : t('admin.regionsConfigured')}
        </h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetchRegionStats()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {t('admin.refreshStats')}
        </Button>
      </div>
      
      {/* Region Cards */}
      <div>
        
        {/* Layout especial para administrador regional */}
        {isRegionalAdmin ? (
          // Diseño ancho completo para administrador regional
          <div className="grid grid-cols-1 gap-6">
            {displayRegions.map(([regionName, configs]) => (
              <Card
                key={regionName}
                className="cursor-pointer transition-all hover:shadow-xl border-2 border-primary/20 hover:border-primary/40"
                onClick={() => setSelectedRegion(selectedRegion === regionName ? null : regionName)}
              >
                <CardHeader className="bg-gray-50 rounded-t-lg p-8 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${getRegionBgColor(regionName)}`}>
                        {getRegionFlag(regionName)}
                      </div>
                      <div>
                        <CardTitle className={`text-3xl font-bold ${getRegionIconColor(regionName)}`}>{regionName}</CardTitle>
                        <CardDescription className="text-gray-600 text-lg mt-1">
                          {t('admin.yourAssignedRegion')} - {configs.length} {t('admin.activeConfigurations')}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary" className={`${getRegionBgColor(regionName)} ${getRegionIconColor(regionName)} text-lg px-4 py-2 border`}>
                        <Trophy className="h-5 w-5 mr-2" />
                        {configs.length} {t('admin.configs')}
                      </Badge>
                      <Badge variant="secondary" className="bg-green-500/20 text-green-700 border-green-200">
                        <Medal className="h-4 w-4 mr-1" />
                        {t('admin.regionalAdmin')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  {(() => {
                    const stats = getRegionStats(regionName);
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
                          <div className="text-sm text-gray-600">{t('admin.totalUsers')}</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-green-600">{stats.campaigns}</div>
                          <div className="text-sm text-gray-600">{t('admin.campaigns')}</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-purple-600">{stats.deals}</div>
                          <div className="text-sm text-gray-600">{t('admin.deals')}</div>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-orange-600">{stats.monthlyPrizes}</div>
                          <div className="text-sm text-gray-600">{t('admin.monthlyPrizes')}</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <Activity className="h-8 w-8 text-red-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-red-600">{stats.activeUsers}</div>
                          <div className="text-sm text-gray-600">{t('admin.activeUsers')}</div>
                        </div>
                        <div className="text-center p-4 bg-indigo-50 rounded-lg">
                          <Award className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-indigo-600">{stats.totalGoals}</div>
                          <div className="text-sm text-gray-600">{t('admin.totalMonthlyGoal')}</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <Settings className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-yellow-600">{stats.supportTickets}</div>
                          <div className="text-sm text-gray-600">{t('admin.supportTicketsCount')}</div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <Trophy className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-gray-600">{stats.activeConfigs}</div>
                          <div className="text-sm text-gray-600">{t('admin.activeConfigs')}</div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Diseño en grid para super-admin y admin
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayRegions.map(([regionName, configs]) => (
              <Card
                key={regionName}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedRegion === regionName ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedRegion(selectedRegion === regionName ? null : regionName)}
              >
                <CardHeader className={`bg-gradient-to-br ${getRegionColor(regionName)} text-white rounded-t-lg`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRegionFlag(regionName)}
                      <CardTitle className="text-xl">{regionName}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {configs.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {t('admin.configurations')}
                      </span>
                      <span className="font-semibold">{configs.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {t('admin.categories')}
                      </span>
                      <span className="font-semibold">
                        {Array.from(new Set(configs.map((c: any) => c.category))).join(", ")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {t('admin.averageGoal')}
                      </span>
                      <span className="font-semibold">
                        {Math.round(configs.reduce((sum: number, c: any) => sum + (c.monthlyGoalTarget || 0), 0) / configs.length)} {t('admin.goals')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Selected Region Details */}
      {selectedRegion && groupedRegions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {getRegionFlag(selectedRegion)}
              {t('admin.configurationsOf')} {selectedRegion}
            </CardTitle>
            <CardDescription>
              {t('admin.detailsOf')} {groupedRegions[selectedRegion].length} {t('admin.configurationsInRegion')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.category')}</TableHead>
                  <TableHead>{t('admin.subcategory')}</TableHead>
                  <TableHead>{t('admin.name')}</TableHead>
                  <TableHead>{t('admin.newCustomerRate')}</TableHead>
                  <TableHead>{t('admin.renewalRate')}</TableHead>
                  <TableHead>{t('admin.monthlyTarget')}</TableHead>
                  <TableHead>{t('admin.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedRegions[selectedRegion].map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCountryFlag(config.subcategory) && (
                          <span>{getCountryFlag(config.subcategory)}</span>
                        )}
                        {config.subcategory || "-"}
                      </div>
                    </TableCell>
                    <TableCell>{config.name}</TableCell>
                    <TableCell>${config.newCustomerGoalRate}</TableCell>
                    <TableCell>${config.renewalGoalRate}</TableCell>
                    <TableCell>{config.monthlyGoalTarget || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={config.isActive ? "default" : "secondary"}>
                        {config.isActive ? t('admin.active') : t('admin.inactive')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!regions || regions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('admin.noRegionsConfigured')}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t('admin.seedRegions')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}