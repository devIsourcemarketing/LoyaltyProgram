import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Coins, 
  Handshake, 
  Gift, 
  DollarSign, 
  Plus, 
  BarChart3,
  Users,
  ClipboardCheck,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import DealModal from "@/components/modals/deal-modal";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import type { AuthUser } from "@/lib/auth";
import backgroundImage from "@assets/hero-usuario.png";
import premiMayorImage from "@assets/premiomayor.png";
import bigPrize1 from "@assets/bp-icon01.png";
import bigPrize2 from "@assets/bp-icon02.png";
import bigPrize3 from "@assets/bp-icon03.png";
import bigPrize4 from "@assets/bp-icon04.png";
import logoHero from "@assets/logo-kaspersky-cup.png";
import { useTranslation } from "@/hooks/useTranslation";
import { isAdminRole } from "@/lib/roles";
import { Footer } from "@/components/layout/footer";
import { useSocket } from "@/hooks/useSocket";
import { useQueryClient } from "@tanstack/react-query";

interface UserStats {
  totalPoints: number;
  availablePoints: number;
  totalDeals: number;
  pendingDeals: number;
  redeemedRewards: number;
  totalGoals: number;
  monthlyGoals: number;
}

interface Deal {
  id: string;
  productName: string;
  dealValue: string;
  dealType: string;
  pointsEarned: number;
  status: string;
  closeDate: string;
  createdAt: string;
}

interface Reward {
  id: string;
  name: string;
  pointsCost: number;
  category: string;
  imageUrl?: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [dealsPage, setDealsPage] = useState(1);
  const dealsPerPage = 10;
  const [, navigate] = useLocation();
  const socket = useSocket();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<AuthUser>({
    queryKey: ["/api/auth/me"],
  });

  // Redirect admin users to admin panel
  useEffect(() => {
    if (user && isAdminRole(user.role)) {
      navigate("/admin");
    }
  }, [user, navigate]);

  // Listen for real-time updates via Socket.IO
  useEffect(() => {
    if (!socket || !user) return;

    // Listen for deal approval events
    const handleDealApproved = (data: { userId: string; dealId: string; points: number }) => {
      console.log('🔔 Deal approved event received:', data);
      
      // Only refresh if it's for the current user
      if (data.userId === user.id) {
        // Invalidate and refetch user stats
        queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/deals/recent"] });
        
        console.log('✅ Dashboard stats refreshed automatically');
      }
    };

    socket.on('dealApproved', handleDealApproved);

    return () => {
      socket.off('dealApproved', handleDealApproved);
    };
  }, [socket, user, queryClient]);

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/users/stats"],
  });

  const { data: recentDeals, isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ["/api/deals/recent"],
    queryFn: async () => {
      const response = await fetch("/api/deals/recent?limit=1000", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch deals");
      return response.json();
    },
    select: (data) => data || [],
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
    select: (data) => data || [],
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<Array<{
    userId: string;
    username: string;
    firstName: string;
    lastName: string;
    totalGoals: number;
  }>>({
    queryKey: ["/api/users/leaderboard?limit=1000"],
    select: (data) => data || [],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(value));
  };

  // Carousel navigation functions
  const itemsPerSlide = 3;
  const totalSlides = rewards ? Math.ceil(rewards.length / itemsPerSlide) : 0;

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const getCurrentRewards = () => {
    if (!rewards) return [];
    const startIndex = currentSlide * itemsPerSlide;
    return rewards.slice(startIndex, startIndex + itemsPerSlide);
  };

  const handleImageError = (rewardId: string) => {
    setFailedImages(prev => new Set(Array.from(prev).concat(rewardId)));
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 padding-top-60">
      {/* Dashboard Header */}
      <div className="mb-8">
        <div 
          className="relative rounded-xl overflow-hidden shadow-material min-h-[400px] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/20"></div>
          
          {user.role !== "admin" ? (
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start p-8 min-h-[400px] display-hero-dashboard">
              {/* Left side - Welcome Message */}
              <div className="flex-1 flex flex-col justify-center">
                <h1 className="text-4xl lg:text-5xl font-bold mb-2 text-white leading-tight" data-testid="text-welcome">
                  {t('dashboard.welcome')}<br />{user.firstName} {user.lastName}!
                </h1>
                <p className="sub-text-welcome font-normal text-[#ffffff]">
                  {t('dashboard.subtitleWelcome')}            
                </p>
                <img src={logoHero} alt="Kaspersky Cup" className="logo-hero-dashboard"/>
              </div>
              
              {/* Right side - Stats Cards */}
              <div className="flex flex-col space-y-4 mt-8 lg:mt-0 lg:ml-8 min-w-[280px]">
                {/* Total Goals Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 flex items-center space-x-4 points-card green-background">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <Coins className="text-gray-700 h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-600 text-sm">{t('dashboard.totalGoalsAccumulated')}</div>
                    <div className="text-2xl font-bold text-gray-900" data-testid="text-total-goals">
                      {statsLoading ? "..." : stats?.totalGoals?.toFixed(1) || "0"}
                    </div>                    
                  </div>
                </div>

                {/* Monthly Goals Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 flex items-center space-x-4 white-background">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center green-background">
                    <Handshake className="text-gray-700 h-6 w-6 white-text" />
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-600 text-sm">{t('dashboard.monthlyGoals')}</div>
                    <div className="text-2xl font-bold text-gray-900" data-testid="text-monthly-goals">
                      {statsLoading ? "..." : stats?.monthlyGoals?.toFixed(1) || "0"}
                    </div>
                    <div className="text-gray-500 text-xs">{t('dashboard.awaitingApproval')}</div>
                  </div>
                </div>

                {/* Redeemed Rewards Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 flex items-center space-x-4 white-background">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center green-background">
                    <Gift className="text-gray-700 h-6 w-6 white-text" />
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-600 text-sm">{t('dashboard.redeemedRewards')}</div>
                    <div className="text-2xl font-bold text-gray-900" data-testid="text-redeemed-rewards">
                      {statsLoading ? "..." : stats?.redeemedRewards || "0"}
                    </div>
                    <div className="text-gray-500 text-xs">{t('dashboard.lifetimeTotal')}</div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="relative z-10 p-8 min-h-[400px] flex items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2 text-white" data-testid="text-welcome">
                  {t('dashboard.welcome')}, {user.firstName} {user.lastName}!
                </h1>
                <p className="text-white text-lg" data-testid="text-admin-role">
                  <span className="font-medium">{t('dashboard.systemAdministrator')}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contest Rules - Only show for regular users */}
      {user.role !== "admin" && (
        <div className="mb-12">
          <Card className="shadow-material bg-gradient-to-br from-blue-50 to-indigo-50 gray-background">
            <CardContent className="p-8">
              {/* Welcome Text */}
              <div className="text-center mb-8">
                <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                  {t('admin.salesTurnIntoGoals')}
                </p>
                <h2 className="text-3xl font-bold text-blue-900 mb-3 text-green-600" data-testid="text-contest-title">
                  {t('dashboard.goodLuck')}
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Points Calculation Box */}
                <div className="bg-white rounded-xl p-6 shadow-md">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center green-background">
                      <Coins className="text-white h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900" data-testid="text-points-calculation-title">
                      {t('dashboard.goalAccumulation')}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg gray-background">
                      <span className="font-normal text-gray-800">{t('dashboard.goalFormula1')}</span>
                      <span className="text-blue-600 font-bold text-green-600">= {t('dashboard.oneGoal')}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg gray-background">
                      <span className="font-normal text-gray-800">{t('dashboard.goalFormula2')}</span>
                      <span className="text-purple-600 font-bold text-green-600">= {t('dashboard.oneGoal')}</span>
                    </div>                    
                  </div>
                </div>

                {/* Grand Prize Box */}
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-6 shadow-md text-white green-background">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center white-background">
                      <Gift className="text-gray-900 h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900" data-testid="text-grand-prize-title">
                      {t('admin.prizes')}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm opacity-90 leading-relaxed text-gray-900">
                      {t('dashboard.monthlyPrizeCondition')}
                    </p>
                    <h3 className="text-xl font-bold text-gray-900" data-testid="text-grand-prize-subtitle">
                      {t('dashboard.monthlyPrizeReward')}
                    </h3>
                    <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                      <div className="text-4xl font-bold mb-2 text-gray-900">{t('admin.grandPrize')}:</div>
                      <p className="text-sm opacity-90 text-gray-900">
                        {t('dashboard.topScorerReward')}
                      </p>
                    </div>                    
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Big Prize Section - Only show for regular users */}
      <div 
        className="relative z-10 flex flex-col lg:flex-row justify-between items-start p-8 min-h-[500px] bigPrize-section"
        style={{ backgroundImage: `url(${premiMayorImage})` }}>
          {/* Left side - Welcome Message */}
          <div className="flex-1 flex flex-col justify-center text-bigPrize">
            <h2 className="text-4xl lg:text-5xl font-bold mb-2 text-green-600" data-testid="text-big-prize">
              {t('dashboard.bigPrize')}
            </h2>
            <p className="text-4xl lg:text-5xl font-medium mb-2 text-[#ffffff]">
              {t('dashboard.bigPrizeSubtitle')}
            </p>
            <p className="sub-text-welcome font-normal text-[#ffffff]">
              {t('dashboard.bigPrizeText')}            
            </p>
            <h2 className="text-4xl lg:text-5xl mb-2 font-medium text-green-600">
              {t('dashboard.includes')}
            </h2>
          </div>
      </div>
      <div className="flex-1 flex flex-col justify-center big-prize-includes">
          <div className="includes-col" data-testid="includes-col1">
            <img src={bigPrize1} alt="Kaspersky Cup" className="big-prize-icon"/>
            <p className="includes-text font-bold text-gray-900">
              {t('dashboard.includesText1')}            
            </p>
          </div>
          <div className="includes-col" data-testid="includes-col2">
            <img src={bigPrize2} alt="Kaspersky Cup" className="big-prize-icon"/>
            <p className="includes-text font-bold text-gray-900">
              {t('dashboard.includesText2')}
            </p>
          </div>
          <div className="includes-col" data-testid="includes-col3">
            <img src={bigPrize3} alt="Kaspersky Cup" className="big-prize-icon"/>
            <p className="includes-text font-bold text-gray-900">
              {t('dashboard.includesText3')}
            </p>
          </div>
          <div className="includes-col" data-testid="includes-col4">
            <img src={bigPrize4} alt="Kaspersky Cup" className="big-prize-icon"/>
            <p className="includes-text font-bold text-gray-900">
              {t('dashboard.includesText4')}            
            </p>
          </div>
      </div>

      <div className="big-prize-final">
          <p className="sub-text-welcome font-medium text-gray-900">
            {t('dashboard.bigPrizeFinalText')}            
          </p>
          <h2 className="text-4xl lg:text-5xl font-medium mb-2 text-green-600">
            {t('dashboard.bigPrizeFinalTitle')}
          </h2>
      </div>

      {/* Leaderboard - Only show for regular users */}
      {user.role !== "admin" && (
        <div className="mb-12">
          <Card className="shadow-material">
            <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center gradient-green">
                    <TrendingUp className="text-white h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900" data-testid="text-leaderboard-title">
                      {t('dashboard.topPerformers')}
                    </h2>                    
                  </div>
                </div>
              </div>              {leaderboardLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {(() => {
                    // Find current user position in the full leaderboard
                    const userPosition = leaderboard.findIndex(u => u.userId === user.id) + 1;
                    const currentUserData = userPosition > 0 ? leaderboard[userPosition - 1] : null;

                    if (!currentUserData) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-gray-600">{t('dashboard.noLeaderboardData')}</p>
                        </div>
                      );
                    }

                    return (
                      <div
                        className="flex items-center space-x-4 p-4 rounded-lg transition-all bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg green-background"
                        data-testid={`leaderboard-item-${userPosition}`}
                      >
                        {/* Position Badge */}
                        <div className="w-12 h-12 bg-gradient-to-br white-background rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg text-green-600">
                            {userPosition}
                          </span>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold truncate text-blue-900 white-text">
                              {currentUserData.firstName} {currentUserData.lastName}
                            </h3>
                            <Badge className="bg-blue-600 text-white white-background text-green-600">{t('dashboard.you')}</Badge>
                          </div>
                          <p className="text-sm text-blue-700 white-text">
                            @{currentUserData.username}
                          </p>
                        </div>

                        {/* Goals */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-900 white-text">
                            {currentUserData.totalGoals.toLocaleString()}
                          </div>
                          <div className="text-sm text-blue-700 white-text">
                            {t('dashboard.goals').toLowerCase()}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">{t('dashboard.noLeaderboardData')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Available Rewards Carousel - Only show for regular users */}
      {user.role !== "admin" && (
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-blue-600 mb-2 text-green-600" data-testid="text-available-rewards-title">
              {t('admin.prizeOfTheMonth')}
            </h2>
            <Button
              onClick={() => navigate("/rewards")}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
              data-testid="button-claim-rewards"
            >
              {t('rewards.claimReward')}
            </Button>
          </div>
          
          <div className="relative px-4 py-4">
            {/* Carousel Container */}
            <div className="flex justify-center items-center space-x-6">
              {/* Left Arrow */}
              <Button
                variant="ghost"
                size="sm"
                onClick={prevSlide}
                disabled={totalSlides <= 1}
                className="p-2 hover:bg-gray-100 disabled:opacity-50 z-10"
                data-testid="button-prev-slide"
              >
                <ChevronLeft className="h-6 w-6 text-gray-600" />
              </Button>

              {/* Rewards Cards */}
              <div className="flex space-x-6 overflow-visible">
                {rewardsLoading ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-lg p-6 w-80 flex-shrink-0"
                    >
                      <Skeleton className="h-32 w-full rounded-lg mb-4" />
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))
                ) : (
                  getCurrentRewards().map((reward) => (
                    <div
                      key={reward.id}
                      className="bg-white rounded-2xl shadow-lg p-6 w-80 flex-shrink-0 hover:shadow-xl transition-shadow cursor-pointer"
                      data-testid={`card-featured-reward-${reward.id}`}
                    >
                      {/* Reward Image */}
                      <div className="relative mb-4 h-48 rounded-lg overflow-hidden bg-white flex items-center justify-center p-2">
                        {reward.imageUrl && !failedImages.has(reward.id) ? (
                          <img
                            src={reward.imageUrl}
                            alt={reward.name}
                            className="w-full h-full object-contain"
                            onError={() => handleImageError(reward.id)}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center rounded-lg gradient-green">
                            <div className="text-white text-center">
                              <Gift className="w-8 h-8 mx-auto mb-2" />
                              <div className="text-sm font-medium">{reward.name}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Reward Info */}
                      <div>
                        <h3 className="text-lg font-bold text-blue-600 mb-2 text-center text-dark" data-testid={`text-reward-name-${reward.id}`}>
                          {reward.name}
                        </h3>
                        <p className="text-gray-600 text-sm text-center" data-testid={`text-reward-points-${reward.id}`}>
                          {reward.pointsCost} points
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right Arrow */}
              <Button
                variant="ghost"
                size="sm"
                onClick={nextSlide}
                disabled={totalSlides <= 1}
                className="p-2 hover:bg-gray-100 disabled:opacity-50 z-10"
                data-testid="button-next-slide"
              >
                <ChevronRight className="h-6 w-6 text-gray-600" />
              </Button>
            </div>

            {/* Pagination Dots */}
            {totalSlides > 1 && (
              <div className="flex justify-center mt-6 space-x-2">
                {Array.from({ length: totalSlides }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === currentSlide
                        ? 'bg-blue-600'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    data-testid={`button-slide-${index}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Deals - Only show for regular users */}
      {user.role !== "admin" && (
        <div className="flex justify-center">
          <div className="w-full max-w-5xl">
          <div className="bg-blue-900 rounded-2xl shadow-xl overflow-hidden background-dark">
            <div className="px-6 py-5">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">{t('dashboard.plays')}</h3>
                <p className="white-text">{t('dashboard.accumulated')} <strong><span className="text-green-600">{statsLoading ? "..." : stats?.totalGoals?.toFixed(1) || "0"} goles</span></strong></p>
              </div>
            </div>
            <div className="overflow-x-auto">
              {dealsLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-20 bg-blue-800" />
                      <Skeleton className="h-4 w-32 bg-blue-800" />
                      <Skeleton className="h-4 w-16 bg-blue-800" />
                      <Skeleton className="h-4 w-16 bg-blue-800" />
                      <Skeleton className="h-6 w-20 bg-blue-800" />
                    </div>
                  ))}
                </div>
              ) : recentDeals && recentDeals.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-blue-950 green-background-opacity15">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                        {t('dashboard.product').toUpperCase()}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                        {t('dashboard.value').toUpperCase()}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                        {t('deals.points').toUpperCase()}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                        {t('dashboard.saleDate').toUpperCase()}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                        {t('dashboard.registrationDate').toUpperCase()}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-800">
                    {recentDeals
                      .slice((dealsPage - 1) * dealsPerPage, dealsPage * dealsPerPage)
                      .map((deal) => {
                      // Calcular goles según el tipo de deal:
                      // NEW_CLIENT: cada $1000 = 1 gol
                      // RENEWAL: cada $2000 = 1 gol
                      const dealValueNum = Number(deal.dealValue);
                      const rate = deal.dealType === 'new_customer' ? 1000 : 2000;
                      const goals = (dealValueNum / rate).toFixed(1);
                      
                      return (
                      <tr key={deal.id} data-testid={`row-deal-${deal.id}`} className="transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          {deal.productName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {formatCurrency(deal.dealValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                          {goals}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {new Date(deal.closeDate).toLocaleDateString('es-ES', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit' 
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {new Date(deal.createdAt).toLocaleDateString('es-ES', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit' 
                          })}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-white/70" data-testid="text-no-deals">
                  No deals found. Register your first deal to get started!
                </div>
              )}
            </div>
            
            {/* Pagination Controls */}
            {recentDeals && recentDeals.length > dealsPerPage && (
              <div className="px-6 py-4 bg-blue-900 border-t flex items-center justify-between green-background">
                <div className="text-sm text-gray-900">
                  {t('dashboard.showing')} {((dealsPage - 1) * dealsPerPage) + 1} - {Math.min(dealsPage * dealsPerPage, recentDeals.length)} de {recentDeals.length} {t('admin.deals')}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDealsPage(p => Math.max(1, p - 1))}
                    disabled={dealsPage === 1}
                    className="hover:green-background text-gray-900 green-background gray-border"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t('dashboard.previous')}
                  </Button>
                  <div className="flex items-center gap-2 px-3 text-gray-900">
                    Página {dealsPage} de {Math.ceil(recentDeals.length / dealsPerPage)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDealsPage(p => Math.min(Math.ceil(recentDeals.length / dealsPerPage), p + 1))}
                    disabled={dealsPage >= Math.ceil(recentDeals.length / dealsPerPage)}
                    className="hover:green-background text-gray-900 green-background gray-border"
                  >
                    {t('dashboard.next')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
      />

      {/* Footer - Only show for regular users */}
      {user.role !== "admin" && <Footer />}
    </div>
  );
}
