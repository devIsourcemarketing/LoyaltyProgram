import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gift, CreditCard, Plane, Laptop, Smartphone, Award, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { apiRequest } from "@/lib/queryClient";
import type { Reward, UserReward, PointsConfig } from "@shared/schema";
import rewardsBackgroundImage from "@assets/rewards-banner.png";

interface UserStats {
  availablePoints: number;
}

export default function Rewards() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/users/stats"],
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
    select: (data) => data || [],
  });

  const { data: userRewards, isLoading: userRewardsLoading } = useQuery<UserReward[]>({
    queryKey: ["/api/user-rewards"],
    select: (data) => data || [],
  });

  const { data: pointsConfig } = useQuery<PointsConfig>({
    queryKey: ["/api/points-config"],
  });

  const redeemMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      return apiRequest("POST", `/api/rewards/${rewardId}/redeem`);
    },
    onSuccess: () => {
      toast({
        title: t("rewards.redemptionSubmitted"),
        description: t("rewards.redemptionPending"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to redeem reward";
      const isAlreadyPending = errorMessage.includes("already have a pending redemption");
      
      toast({
        title: isAlreadyPending ? t("rewards.redemptionAlreadyPending") : t("common.error"),
        description: isAlreadyPending 
          ? t("rewards.alreadyPendingDescription")
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleRedeem = (reward: Reward) => {
    if (!stats || stats.availablePoints < reward.pointsCost) {
      toast({
        title: t("rewards.insufficientPoints"),
        description: `You need ${reward.pointsCost.toLocaleString()} points to redeem this reward.`,
        variant: "destructive",
      });
      return;
    }
    
    // Prevent multiple clicks if already pending
    if (redeemMutation.isPending) {
      return;
    }
    
    redeemMutation.mutate(reward.id);
  };

  const getRewardIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "gift cards":
        return <CreditCard className="w-6 h-6 text-white" />;
      case "travel":
        return <Plane className="w-6 h-6 text-white" />;
      case "electronics":
        return <Laptop className="w-6 h-6 text-white" />;
      case "accessories":
        return <Smartphone className="w-6 h-6 text-white" />;
      default:
        return <Gift className="w-6 h-6 text-white" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "gift cards":
        return "from-green-400 to-green-600";
      case "travel":
        return "from-blue-400 to-blue-600";
      case "electronics":
        return "from-purple-400 to-purple-600";
      case "accessories":
        return "from-orange-400 to-orange-600";
      default:
        return "from-gray-400 to-gray-600";
    }
  };

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

  const getShipmentStatusColor = (shipmentStatus: string) => {
    switch (shipmentStatus) {
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getShipmentStatusLabel = (shipmentStatus: string) => {
    switch (shipmentStatus) {
      case "pending":
        return t("rewards.pendingShipment");
      case "shipped":
        return t("rewards.shipped");
      case "delivered":
        return t("rewards.delivered");
      default:
        return "Unknown";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const categories = Array.from(new Set(rewards?.map(reward => reward.category) || []));

  const filteredRewards = (category?: string) => {
    if (!category) return rewards || [];
    return rewards?.filter(reward => reward.category === category) || [];
  };

  const availableRewards = () => {
    if (!rewards || !stats) return [];
    return rewards.filter(reward => stats.availablePoints >= reward.pointsCost);
  };

  return (
    <div className="min-h-screen bg-white padding-top-60">
      {/* Hero Banner */}
      <div 
        className="relative z-10 bg-transparent margin-auto width-1210 rounded-xl display-hero-rewards"
        style={{
          backgroundImage: `url(${rewardsBackgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          minHeight: '400px',
        }}
      >
        <div className="max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
          <div className="text-left space-y-4 max-w-lg">
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-white" data-testid="text-page-title">
              {t('rewards.textHeroRewards')}
            </h1>
            <p className="white-text">
              {t('rewards.subTextHeroRewards')}
            </p>
            
          </div>
        </div>        
      </div>
      
      {/* Content Area */}
      <div className="relative z-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Redemption Period Alert */}
      {pointsConfig?.redemptionStartDate && pointsConfig?.redemptionEndDate && (
        <Alert className="mb-6 bg-blue-50 border-blue-200" data-testid="alert-redemption-period">
          <Calendar className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <span className="font-semibold">{t("rewards.redemptionPeriod")}</span>{" "}
            {new Date(pointsConfig.redemptionStartDate).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            -{" "}
            {new Date(pointsConfig.redemptionEndDate).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
          <TabsTrigger value="all">{t("rewards.allRewards")}</TabsTrigger>
          <TabsTrigger value="available">{t("rewards.availableRewards")}</TabsTrigger>
          {categories.slice(0, 4).map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
          <TabsTrigger value="my-rewards">{t("rewards.myRewards")}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {rewardsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="shadow-material">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rewards && rewards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rewards.map((reward) => (
                <Card key={reward.id} className="shadow-material overflow-hidden" data-testid={`card-reward-${reward.id}`}>
                  {/* Image Header */}
                  {reward.imageUrl && (
                    <div className="w-full h-48 bg-gray-100 relative overflow-hidden">
                      <img 
                        src={reward.imageUrl} 
                        alt={reward.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4 reward-info">
                      {!reward.imageUrl && (
                        <div className="w-12 h-12 bg-gradient-to-br rounded-lg flex items-center justify-center green-background">
                          {getRewardIcon(reward.category)}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                        <p className="text-sm text-gray-600 text-center">
                          <span className="goal-number text-green-600">{reward.pointsCost.toLocaleString()}</span> Goals
                        </p>
                      </div>
                    </div>
                    
                    {reward.description && (
                      <p className="text-sm text-gray-600 mb-4 text-center">{reward.description}</p>
                    )}
                    
                    <Badge variant="outline" className="mb-4 reward-category">
                      {reward.category}
                    </Badge>
                    
                    <Button
                      className="w-full gradient-green"
                      onClick={() => handleRedeem(reward)}
                      disabled={!stats || stats.availablePoints < reward.pointsCost || redeemMutation.isPending}
                      data-testid={`button-redeem-${reward.id}`}
                    >
                      {!stats || stats.availablePoints < reward.pointsCost
                        ? t("rewards.insufficientPoints")
                        : redeemMutation.isPending
                        ? t("rewards.redeeming")
                        : t("rewards.redeem")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-material">
              <CardContent className="p-12 text-center">
                <Gift className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid="text-no-rewards-title">
                  {t("rewards.noRewards")}
                </h3>
                <p className="text-gray-600" data-testid="text-no-rewards-description">
                  {t("rewards.noRewardsDesc")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="available" className="mt-6">
          {rewardsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="shadow-material">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : availableRewards().length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableRewards().map((reward) => (
                <Card key={reward.id} className="shadow-material border-green-200 overflow-hidden" data-testid={`card-available-reward-${reward.id}`}>
                  {reward.imageUrl && (
                    <div className="w-full h-48 bg-gray-100 relative overflow-hidden">
                      <img 
                        src={reward.imageUrl} 
                        alt={reward.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.parentElement!.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <CardContent className="p-6">
                    {!reward.imageUrl && (
                      <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(reward.category)} rounded-lg flex items-center justify-center green-background mb-4`}>
                        {getRewardIcon(reward.category)}
                      </div>
                    )}
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                      <p className="text-sm text-green-600 font-medium">
                        <span className="goal-number">{reward.pointsCost.toLocaleString()}</span> Goals ✓
                      </p>
                    </div>
                    
                    {reward.description && (
                      <p className="text-sm text-gray-600 mb-4 text-center">{reward.description}</p>
                    )}
                    
                    <Badge variant="outline" className="mb-4 border-green-200 text-green-700 reward-category">
                      {reward.category}
                    </Badge>
                    
                    <Button
                      className="w-full bg-green-600 gradient-green hover:bg-green-700"
                      onClick={() => handleRedeem(reward)}
                      disabled={redeemMutation.isPending}
                      data-testid={`button-redeem-available-${reward.id}`}
                    >
                      {redeemMutation.isPending
                        ? t("rewards.redeeming")
                        : t("rewards.redeem")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-material">
              <CardContent className="p-12 text-center">
                <Gift className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid="text-no-available-rewards-title">
                  {t("rewards.noAvailableRewards")}
                </h3>
                <p className="text-gray-600" data-testid="text-no-available-rewards-description">
                  {t("rewards.noAvailableRewardsDesc")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRewards(category).map((reward) => (
                <Card key={reward.id} className="shadow-material overflow-hidden">
                  {reward.imageUrl && (
                    <div className="w-full h-48 bg-gray-100 relative overflow-hidden">
                      <img 
                        src={reward.imageUrl} 
                        alt={reward.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.parentElement!.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <CardContent className="p-6">
                    {!reward.imageUrl && (
                      <div className={`w-12 h-12 bg-gradient-to-br ${getCategoryColor(reward.category)} rounded-lg flex items-center justify-center green-background mb-4`}>
                        {getRewardIcon(reward.category)}
                      </div>
                    )}
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                      <p className="text-sm text-gray-600">
                        <span className="goal-number text-green-600">{reward.pointsCost.toLocaleString()}</span> Goals
                      </p>
                    </div>
                    
                    {reward.description && (
                      <p className="text-sm text-gray-600 mb-4 text-center">{reward.description}</p>
                    )}
                    
                    <Button
                      className="w-full gradient-green"
                      onClick={() => handleRedeem(reward)}
                      disabled={!stats || stats.availablePoints < reward.pointsCost || redeemMutation.isPending}
                    >
                      {!stats || stats.availablePoints < reward.pointsCost
                        ? t("rewards.insufficientPoints")
                        : redeemMutation.isPending
                        ? t("rewards.redeeming")
                        : t("rewards.redeem")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="my-rewards" className="mt-6">
          {userRewardsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="shadow-material">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <Skeleton className="h-12 w-12 rounded-lg green-background" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : userRewards && userRewards.length > 0 ? (
            <div className="space-y-4">
              {userRewards.map((userReward: any) => (
                <Card key={userReward.id} className="shadow-material overflow-hidden" data-testid={`card-user-reward-${userReward.id}`}>
                  <div className="flex flex-col md:flex-row">
                    {/* Image Section */}
                    {userReward.imageUrl && (
                      <div className="w-full md:w-48 h-48 bg-gray-100 relative overflow-hidden flex-shrink-0">
                        <img 
                          src={userReward.imageUrl} 
                          alt={userReward.rewardName || 'Reward'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.parentElement!.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Content Section */}
                    <CardContent className="p-6 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          {!userReward.imageUrl && (
                            <div className={`w-12 h-12 green-background ${
                              userReward.status === 'approved' ? 'bg-green-100' :
                              userReward.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                            } rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <Award className={`w-6 h-6 white-text ${
                                userReward.status === 'approved' ? 'text-green-600' :
                                userReward.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                              }`} />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900" data-testid={`text-reward-name-${userReward.id}`}>
                              {userReward.rewardName || 'Unknown Reward'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {userReward.pointsCost?.toLocaleString()} points • Redeemed: {new Date(userReward.redeemedAt).toLocaleDateString()}
                            </p>
                          
                          {/* Status Information */}
                          {userReward.status === 'pending' && (
                            <p className="text-sm text-yellow-600 mt-1">
                              {t("rewards.waitingApproval")}
                            </p>
                          )}
                          {userReward.status === 'rejected' && userReward.rejectionReason && (
                            <p className="text-sm text-red-600 mt-1">
                              {t("rewards.rejectedReason")}: {userReward.rejectionReason}
                            </p>
                          )}
                          {userReward.status === 'approved' && userReward.approvedAt && (
                            <p className="text-sm text-green-600 mt-1">
                              {t("rewards.approvedOn")}: {new Date(userReward.approvedAt).toLocaleDateString()}
                            </p>
                          )}
                          
                          {/* Shipment Information - Only show if approved */}
                          {userReward.status === 'approved' && userReward.shipmentStatus && (
                            <div className="mt-2">
                              <div className="flex items-center space-x-2">
                                <Badge className={getShipmentStatusColor(userReward.shipmentStatus)} data-testid={`badge-shipment-${userReward.id}`}>
                                  {getShipmentStatusLabel(userReward.shipmentStatus)}
                                </Badge>
                              </div>
                              
                              {/* Shipment dates */}
                              <div className="mt-1 text-xs text-gray-500">
                                {userReward.shippedAt && (
                                  <div>{t("rewards.shippedOn")}: {new Date(userReward.shippedAt).toLocaleDateString()}</div>
                                )}
                                {userReward.deliveredAt && (
                                  <div>{t("rewards.deliveredOn")}: {new Date(userReward.deliveredAt).toLocaleDateString()}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <Badge className={`${
                          userReward.status === 'approved' ? 'bg-green-100 text-green-800 green-background white-text' :
                          userReward.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`} data-testid={`badge-status-${userReward.id}`}>
                          {userReward.status === 'approved' ? 'Approved' :
                           userReward.status === 'pending' ? 'Pending' : 'Rejected'}
                        </Badge>
                      </div>
                    </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-material">
              <CardContent className="p-12 text-center">
                <Award className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2" data-testid="text-no-user-rewards-title">
                  {t("rewards.noUserRewards")}
                </h3>
                <p className="text-gray-600" data-testid="text-no-user-rewards-description">
                  {t("rewards.noUserRewardsDesc")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  );
}
