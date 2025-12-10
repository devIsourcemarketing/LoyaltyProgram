import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Trophy, Users, TrendingUp, Calendar, Award, Save, Edit, Trash2, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { User } from "@shared/schema";

interface GrandPrizeCriteria {
  id?: string;
  name: string;
  criteriaType: "points" | "deals" | "combined" | "top_goals";
  minPoints?: number;
  minDeals?: number;
  region?: string;
  marketSegment?: string; // ENTERPRISE, SMB, MSSP
  partnerCategory?: string; // PLATINUM, GOLD, SILVER, REGISTERED
  regionSubcategory?: string; // COLOMBIA, CENTRO AMERICA, etc.
  prizeDescription?: string; // Language-independent prize description
  prizeLocation?: string; // New York New Jersey Stadium, etc.
  prizeCountry?: string; // USA, CANADA, MEXICO
  prizeDate?: string; // June 30, July 2, etc.
  prizeRound?: string; // 32, 16, Final
  rankingPosition?: number; // 1 = first place, 2 = second place, etc.
  startDate?: string;
  endDate?: string;
  redemptionStartDate?: string; // When winners can claim prize
  redemptionEndDate?: string; // Deadline to claim prize
  pointsWeight?: number; // Para criterio combinado
  dealsWeight?: number; // Para criterio combinado
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserRanking {
  user: User;
  points: number;
  deals: number;
  score: number;
  rank: number;
}

export default function GrandPrizeTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [criteria, setCriteria] = useState<GrandPrizeCriteria>({
    name: "",
    criteriaType: "combined",
    minPoints: 0,
    minDeals: 0,
    // region se asigna automáticamente del contexto
    marketSegment: "",
    partnerCategory: "",
    regionSubcategory: "",
    prizeDescription: "",
    prizeLocation: "",
    prizeCountry: "",
    prizeDate: "",
    prizeRound: "",
    rankingPosition: 1,
    startDate: "",
    endDate: "",
    redemptionStartDate: "",
    redemptionEndDate: "",
    pointsWeight: 60,
    dealsWeight: 40,
    isActive: true,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  // Establecer región basada en el rol del usuario
  useEffect(() => {
    if (currentUser) {
      const user = currentUser as any;
      if (user.role === "regional-admin") {
        const userRegion = user.region || user.country || "";
        setSelectedRegion(userRegion);
      } else if (user.role === "admin" || user.role === "super-admin") {
        // Para admin/super-admin, establecer región por defecto si no hay una seleccionada
        if (!selectedRegion) {
          setSelectedRegion("NOLA");
        }
      }
    }
  }, [currentUser, selectedRegion]);

  // SIMPLE: La región se asigna automáticamente en handleSaveCriteria
  // No necesitamos sincronizar manualmente

  // Fetch ALL criteria
  const { data: allCriteria, isLoading: criteriaLoading } = useQuery<GrandPrizeCriteria[]>({
    queryKey: ["/api/admin/grand-prize/criteria/all", selectedRegion],
    queryFn: async () => {
      const url = selectedRegion 
        ? `/api/admin/grand-prize/criteria/all?region=${selectedRegion}`
        : "/api/admin/grand-prize/criteria/all";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch grand prize criteria");
      return res.json();
    },
    enabled: !!selectedRegion,
  });

  // Fetch current active criteria
  const { data: currentCriteria } = useQuery<GrandPrizeCriteria>({
    queryKey: ["/api/admin/grand-prize/criteria", selectedRegion],
    queryFn: async () => {
      const url = selectedRegion 
        ? `/api/admin/grand-prize/criteria?region=${selectedRegion}`
        : "/api/admin/grand-prize/criteria";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch active grand prize criteria");
      return res.json();
    },
    enabled: !!selectedRegion,
  });

  // Fetch ranking based on criteria
  const { data: ranking, isLoading: rankingLoading } = useQuery<UserRanking[]>({
    queryKey: ["/api/admin/grand-prize/ranking", currentCriteria?.id, selectedRegion],
    enabled: !!currentCriteria?.id && !!selectedRegion,
  });

  // Save/Update criteria mutation
  const saveCriteriaMutation = useMutation({
    mutationFn: async (data: GrandPrizeCriteria) => {
      const url = editingId
        ? `/api/admin/grand-prize/criteria/${editingId}`
        : "/api/admin/grand-prize/criteria";
      
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || t("admin.errorSavingCriteria"));
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/grand-prize/criteria", selectedRegion] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/grand-prize/criteria/all", selectedRegion] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/grand-prize/ranking", undefined, selectedRegion] });
      setEditingId(null);
      setCriteria({
        name: "",
        criteriaType: "combined",
        minPoints: 0,
        minDeals: 0,
        // region se asigna automáticamente del contexto
        marketSegment: "",
        partnerCategory: "",
        regionSubcategory: "",
        prizeDescription: "",
        prizeLocation: "",
        prizeCountry: "",
        prizeDate: "",
        prizeRound: "",
        rankingPosition: 1,
        startDate: "",
        endDate: "",
        redemptionStartDate: "",
        redemptionEndDate: "",
        pointsWeight: 60,
        dealsWeight: 40,
        isActive: true,
      });
      toast({
        title: t("admin.criteriaSaved"),
        description: t("admin.grandPrizeCriteriaUpdated"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.couldNotSaveCriteria"),
        variant: "destructive",
      });
    },
  });

  // Delete criteria mutation
  const deleteCriteriaMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/grand-prize/criteria/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || t("admin.errorDeletingCriteria"));
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/grand-prize/criteria", selectedRegion] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/grand-prize/criteria/all", selectedRegion] });
      toast({
        title: t("admin.criteriaDeleted"),
        description: t("admin.criteriaDeletedSuccessfully"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.couldNotDeleteCriteria"),
        variant: "destructive",
      });
    },
  });

  const handleSaveCriteria = () => {
    // SIMPLE: Automáticamente usar la región del contexto
    const dataToSave = {
      ...criteria,
      region: selectedRegion, // Siempre usar la región seleccionada arriba
    };
    saveCriteriaMutation.mutate(dataToSave);
  };

  const handleEditCriteria = (criteriaToEdit: GrandPrizeCriteria) => {
    setEditingId(criteriaToEdit.id || null);
    setCriteria({
      name: criteriaToEdit.name,
      criteriaType: criteriaToEdit.criteriaType,
      minPoints: criteriaToEdit.minPoints || 0,
      minDeals: criteriaToEdit.minDeals || 0,
      region: criteriaToEdit.region || "all",
      marketSegment: criteriaToEdit.marketSegment || "_all",
      partnerCategory: criteriaToEdit.partnerCategory || "_all",
      regionSubcategory: criteriaToEdit.regionSubcategory || "",
      prizeDescription: criteriaToEdit.prizeDescription || "",
      prizeLocation: criteriaToEdit.prizeLocation || "",
      prizeCountry: criteriaToEdit.prizeCountry || "",
      prizeDate: criteriaToEdit.prizeDate || "",
      prizeRound: criteriaToEdit.prizeRound || "",
      rankingPosition: criteriaToEdit.rankingPosition || 1,
      startDate: criteriaToEdit.startDate ? new Date(criteriaToEdit.startDate).toISOString().split('T')[0] : "",
      endDate: criteriaToEdit.endDate ? new Date(criteriaToEdit.endDate).toISOString().split('T')[0] : "",
      redemptionStartDate: criteriaToEdit.redemptionStartDate ? new Date(criteriaToEdit.redemptionStartDate).toISOString().split('T')[0] : "",
      redemptionEndDate: criteriaToEdit.redemptionEndDate ? new Date(criteriaToEdit.redemptionEndDate).toISOString().split('T')[0] : "",
      pointsWeight: criteriaToEdit.pointsWeight || 60,
      dealsWeight: criteriaToEdit.dealsWeight || 40,
      isActive: criteriaToEdit.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCriteria({
      name: "",
      criteriaType: "combined",
      minPoints: 0,
      minDeals: 0,
      region: "all",
      marketSegment: "",
      partnerCategory: "",
      regionSubcategory: "",
      prizeDescription: "",
      prizeLocation: "",
      prizeCountry: "",
      prizeDate: "",
      prizeRound: "",
      rankingPosition: 1,
      startDate: "",
      endDate: "",
      redemptionStartDate: "",
      redemptionEndDate: "",
      pointsWeight: 60,
      dealsWeight: 40,
      isActive: true,
    });
  };

  const handleDeleteCriteria = (id: string) => {
    deleteCriteriaMutation.mutate(id);
  };

  if (criteriaLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de Región */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 mb-2">{t('admin.region')}</h3>
            {currentUser && (currentUser as any).role === "regional-admin" ? (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {selectedRegion}
                </Badge>
                <span className="text-xs text-gray-500">
                  ({t('admin.regionalAdminGrandPrizeInfo')})
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('admin.selectRegion')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOLA">NOLA</SelectItem>
                    <SelectItem value="SOLA">SOLA</SelectItem>
                    <SelectItem value="BRASIL">BRASIL</SelectItem>
                    <SelectItem value="MEXICO">MEXICO</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-gray-500">
                  {t('admin.selectRegionToManageGrandPrize')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Criteria Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            {t('admin.criteriaConfiguration')}
          </CardTitle>
          <CardDescription>
            {t('admin.defineGrandPrizeCriteriaDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Nombre del Criterio */}
          <div className="space-y-2">
            <Label htmlFor="criteria-name">{t('admin.criteriaName')}</Label>
            <Input
              id="criteria-name"
              value={criteria.name}
              onChange={(e) => setCriteria({ ...criteria, name: e.target.value })}
              placeholder={t('admin.criteriaNamePlaceholder')}
            />
          </div>

          {/* Tipo de Criterio */}
          <div className="space-y-2">
            <Label htmlFor="criteria-type">{t('admin.criteriaType')}</Label>
            <Select
              value={criteria.criteriaType}
              onValueChange={(value: "points" | "deals" | "combined" | "top_goals") =>
                setCriteria({ ...criteria, criteriaType: value })
              }
            >
              <SelectTrigger id="criteria-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top_goals">{t('admin.topGoalsRanking')}</SelectItem>
                <SelectItem value="points">{t('admin.onlyPoints')}</SelectItem>
                <SelectItem value="deals">{t('admin.onlyDeals')}</SelectItem>
                <SelectItem value="combined">{t('admin.combinedPointsDeals')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Criterios según el tipo */}
          {(criteria.criteriaType === "points" || criteria.criteriaType === "combined") && (
            <div className="space-y-2">
              <Label htmlFor="min-points">{t("admin.minPointsRequired")}</Label>
              <Input
                id="min-points"
                type="number"
                value={criteria.minPoints || 0}
                onChange={(e) => setCriteria({ ...criteria, minPoints: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          )}

          {(criteria.criteriaType === "deals" || criteria.criteriaType === "combined") && (
            <div className="space-y-2">
              <Label htmlFor="min-deals">{t("admin.minDealsCompleted")}</Label>
              <Input
                id="min-deals"
                type="number"
                value={criteria.minDeals || 0}
                onChange={(e) => setCriteria({ ...criteria, minDeals: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          )}

          {/* Pesos para criterio combinado */}
          {criteria.criteriaType === "combined" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="points-weight">{t('admin.pointsWeight')}</Label>
                <Input
                  id="points-weight"
                  type="number"
                  min="0"
                  max="100"
                  value={criteria.pointsWeight || 60}
                  onChange={(e) => {
                    const pointsWeight = parseInt(e.target.value) || 0;
                    setCriteria({ 
                      ...criteria, 
                      pointsWeight,
                      dealsWeight: 100 - pointsWeight 
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deals-weight">{t('admin.dealsWeight')}</Label>
                <Input
                  id="deals-weight"
                  type="number"
                  min="0"
                  max="100"
                  value={criteria.dealsWeight || 40}
                  onChange={(e) => {
                    const dealsWeight = parseInt(e.target.value) || 0;
                    setCriteria({ 
                      ...criteria, 
                      dealsWeight,
                      pointsWeight: 100 - dealsWeight 
                    });
                  }}
                />
              </div>
            </div>
          )}

          {/* Región - OCULTO: se usa automáticamente la región del contexto */}
          <input type="hidden" value={selectedRegion} />

          <Separator />

          {/* Prize Segmentation Section */}
          <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              <Label className="text-base font-semibold text-blue-900">{t('admin.prizeSegmentation')}</Label>
            </div>
            <p className="text-sm text-blue-700">
              {t('admin.prizeSegmentationDesc')}
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Market Segment */}
              <div className="space-y-2">
                <Label htmlFor="market-segment">{t('admin.marketSegment')}</Label>
                <Select
                  value={criteria.marketSegment || "_all"}
                  onValueChange={(value) => setCriteria({ ...criteria, marketSegment: value === "_all" ? undefined : value })}
                >
                  <SelectTrigger id="market-segment">
                    <SelectValue placeholder={t('admin.allSegments')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">{t('admin.allSegments')}</SelectItem>
                    <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                    <SelectItem value="SMB">SMB</SelectItem>
                    <SelectItem value="MSSP">MSSP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Partner Category */}
              <div className="space-y-2">
                <Label htmlFor="partner-category">{t('admin.partnerCategory')}</Label>
                <Select
                  value={criteria.partnerCategory || "_all"}
                  onValueChange={(value) => setCriteria({ ...criteria, partnerCategory: value === "_all" ? undefined : value })}
                >
                  <SelectTrigger id="partner-category">
                    <SelectValue placeholder={t('admin.allCategories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">{t('admin.allCategories')}</SelectItem>
                    <SelectItem value="PLATINUM">PLATINUM</SelectItem>
                    <SelectItem value="GOLD">GOLD</SelectItem>
                    <SelectItem value="SILVER">SILVER</SelectItem>
                    <SelectItem value="SILVER & REGISTERED">SILVER & REGISTERED</SelectItem>
                    <SelectItem value="REGISTERED">REGISTERED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Region Subcategory */}
            <div className="space-y-2">
              <Label htmlFor="regionSubcategory">{t('admin.subregion')}</Label>
              <Select
                value={criteria.regionSubcategory || "_none"}
                onValueChange={(value) => setCriteria({ ...criteria, regionSubcategory: value === "_none" ? undefined : value })}
              >
                <SelectTrigger id="regionSubcategory">
                  <SelectValue placeholder={t('admin.allSubregions')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t('admin.allSubregions')}</SelectItem>
                  {selectedRegion === "NOLA" && (
                    <>
                      <SelectItem value="COLOMBIA">COLOMBIA</SelectItem>
                      <SelectItem value="CENTRO AMERICA">CENTRO AMERICA</SelectItem>
                      <SelectItem value="COLOMBIA & CENTRO AMÉRICA">COLOMBIA & CENTRO AMÉRICA</SelectItem>
                    </>
                  )}
                  {selectedRegion === "SOLA" && (
                    <>
                      <SelectItem value="ARGENTINA">ARGENTINA</SelectItem>
                      <SelectItem value="CHILE">CHILE</SelectItem>
                      <SelectItem value="PERU">PERU</SelectItem>
                    </>
                  )}
                  {selectedRegion === "MEXICO" && (
                    <SelectItem value="MEXICO">MEXICO</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {t('admin.subregionHelp')}
              </p>
            </div>

            {/* Ranking Position */}
            <div className="space-y-2">
              <Label htmlFor="ranking-position">{t('admin.rankingPositionToWin')}</Label>
              <Input
                id="ranking-position"
                type="number"
                min="1"
                value={criteria.rankingPosition || 1}
                onChange={(e) => setCriteria({ ...criteria, rankingPosition: parseInt(e.target.value) || 1 })}
              />
              <p className="text-xs text-gray-500">
                {t('admin.rankingPositionHelp')}
              </p>
            </div>
          </div>

          <Separator />

          {/* Prize Details Section */}
          <div className="space-y-4 bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-green-600" />
              <Label className="text-base font-semibold text-green-900">{t('admin.prizeDetails')}</Label>
            </div>
            <p className="text-sm text-green-700">
              {t('admin.prizeDetailsDesc')}
            </p>

            <div className="space-y-2">
              <Label htmlFor="prize-description">{t('admin.prizeDescription')}</Label>
              <Input
                id="prize-description"
                value={criteria.prizeDescription || ""}
                onChange={(e) => setCriteria({ ...criteria, prizeDescription: e.target.value })}
                placeholder={t('admin.grandPrizeDescriptionPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prize-location">{t('admin.stadiumLocation')}</Label>
                <Input
                  id="prize-location"
                  value={criteria.prizeLocation || ""}
                  onChange={(e) => setCriteria({ ...criteria, prizeLocation: e.target.value })}
                  placeholder={t('admin.stadiumPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prize-country">{t('admin.country')}</Label>
                <Select
                  value={criteria.prizeCountry || "_none"}
                  onValueChange={(value) => setCriteria({ ...criteria, prizeCountry: value === "_none" ? undefined : value })}
                >
                  <SelectTrigger id="prize-country">
                    <SelectValue placeholder={t('admin.country')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{t('admin.notSpecified')}</SelectItem>
                    <SelectItem value="USA">USA</SelectItem>
                    <SelectItem value="CANADA">CANADA</SelectItem>
                    <SelectItem value="MEXICO">MEXICO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prize-date">{t('admin.eventDateLabel')}</Label>
                <Input
                  id="prize-date"
                  value={criteria.prizeDate || ""}
                  onChange={(e) => setCriteria({ ...criteria, prizeDate: e.target.value })}
                  placeholder={t('admin.eventDatePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prize-round">{t('admin.tournamentRound')}</Label>
                <Select
                  value={criteria.prizeRound || "_none"}
                  onValueChange={(value) => setCriteria({ ...criteria, prizeRound: value === "_none" ? undefined : value })}
                >
                  <SelectTrigger id="prize-round">
                    <SelectValue placeholder={t('admin.tournamentRoundPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{t('admin.notSpecified')}</SelectItem>
                    <SelectItem value="32">Round of 32</SelectItem>
                    <SelectItem value="16">Round of 16</SelectItem>
                    <SelectItem value="Quarter Finals">Quarter Finals</SelectItem>
                    <SelectItem value="Semi Finals">Semi Finals</SelectItem>
                    <SelectItem value="Final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Rango de Fechas - Evaluation Period */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <Label className="text-base font-semibold">{t("admin.evaluationPeriod")}</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">{t("admin.startDate")}</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={criteria.startDate || ""}
                  onChange={(e) => setCriteria({ ...criteria, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">{t("admin.endDate")}</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={criteria.endDate || ""}
                  onChange={(e) => setCriteria({ ...criteria, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Redemption Period */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <Label className="text-base font-semibold">{t("admin.redemptionPeriod")}</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("admin.redemptionPeriodGrandPrizeDesc")}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="redemption-start-date">{t("admin.redemptionStartDate")}</Label>
                <Input
                  id="redemption-start-date"
                  type="date"
                  value={criteria.redemptionStartDate || ""}
                  onChange={(e) => setCriteria({ ...criteria, redemptionStartDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redemption-end-date">{t("admin.redemptionEndDate")}</Label>
                <Input
                  id="redemption-end-date"
                  type="date"
                  value={criteria.redemptionEndDate || ""}
                  onChange={(e) => setCriteria({ ...criteria, redemptionEndDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Estado Activo */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is-active">{t("admin.activeCriteria")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("admin.activeCriteriaDescription")}
              </p>
            </div>
            <Switch
              id="is-active"
              checked={criteria.isActive}
              onCheckedChange={(checked) => setCriteria({ ...criteria, isActive: checked })}
            />
          </div>

          <Separator />

          {/* Save/Cancel Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleSaveCriteria} 
              disabled={saveCriteriaMutation.isPending}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveCriteriaMutation.isPending 
                ? t("common.saving")
                : editingId 
                  ? t("admin.updateCriteria")
                  : t("admin.createNewCriterion")}
            </Button>
            {editingId && (
              <Button 
                onClick={handleCancelEdit} 
                variant="outline"
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Criterios Configurados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t("admin.configuredCriteria")}
          </CardTitle>
          <CardDescription>
            {t("admin.allGrandPrizeCriteriaDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allCriteria && allCriteria.length > 0 ? (
            <div className="space-y-3">
              {allCriteria.map((crit) => (
                <div
                  key={crit.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    crit.isActive ? "bg-green-50 border-green-300" : "bg-gray-50"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{crit.name}</p>
                      {crit.isActive && (
                        <Badge variant="default" className="bg-green-600">{t('admin.active')}</Badge>
                      )}
                      {crit.rankingPosition && crit.rankingPosition > 1 && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700">
                          {crit.rankingPosition === 1 ? t('admin.firstPlaceBadge') : 
                           crit.rankingPosition === 2 ? t('admin.secondPlaceBadge') : 
                           crit.rankingPosition === 3 ? t('admin.thirdPlaceBadge') :
                           `${crit.rankingPosition}th`}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Tipo: {
                        crit.criteriaType === "points" ? t("admin.onlyPoints") :
                        crit.criteriaType === "deals" ? t("admin.onlyDeals") :
                        crit.criteriaType === "top_goals" ? t("admin.topGoalsRanking") :
                        `Combinado (${crit.pointsWeight}% puntos / ${crit.dealsWeight}% deals)`
                      }</p>
                      <p>
                        Región: {crit.region === "all" ? "Todas" : crit.region}
                        {crit.marketSegment && <> • {crit.marketSegment}</>}
                        {crit.partnerCategory && <> • {crit.partnerCategory}</>}
                        {crit.regionSubcategory && <> • {crit.regionSubcategory}</>}
                      </p>
                      {crit.prizeLocation && (
                        <p className="flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          {crit.prizeLocation} ({crit.prizeCountry}) - {crit.prizeDate}, Round {crit.prizeRound}
                        </p>
                      )}
                      {crit.startDate && crit.endDate && (
                        <p>
                          Período: {new Date(crit.startDate).toLocaleDateString()} - {new Date(crit.endDate).toLocaleDateString()}
                        </p>
                      )}
                      {(crit.minPoints || crit.minDeals) && (
                        <p>
                          Mínimos: 
                          {crit.minPoints ? ` ${crit.minPoints} puntos` : ""}
                          {crit.minPoints && crit.minDeals ? " /" : ""}
                          {crit.minDeals ? ` ${crit.minDeals} deals` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCriteria(crit)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("admin.deleteCriteria")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("admin.deleteCriteriaConfirmation")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteCriteria(crit.id!)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {t("common.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.noCriteriaConfigured")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranking Card */}
      {currentCriteria?.id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {t('admin.currentRanking')}
            </CardTitle>
            <CardDescription>
              {t('admin.usersOrderedByCriteria')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rankingLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : ranking && ranking.length > 0 ? (
              <div className="space-y-3">
                {ranking.slice(0, 10).map((entry, index) => (
                  <div
                    key={entry.user.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      index === 0 ? "bg-yellow-50 border-yellow-300" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8">
                        {index === 0 && <Trophy className="w-6 h-6 text-yellow-600" />}
                        {index === 1 && <Award className="w-6 h-6 text-gray-400" />}
                        {index === 2 && <Award className="w-6 h-6 text-orange-600" />}
                        {index > 2 && <span className="font-semibold text-gray-500">#{entry.rank}</span>}
                      </div>
                      <div>
                        <p className="font-medium">
                          {entry.user.firstName} {entry.user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{entry.user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">{entry.score.toFixed(2)} pts</p>
                      <div className="flex gap-2 text-sm text-muted-foreground">
                        <span>{entry.points} puntos</span>
                        <span>•</span>
                        <span>{entry.deals} deals</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('admin.noUsersMatchCriteria')}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
