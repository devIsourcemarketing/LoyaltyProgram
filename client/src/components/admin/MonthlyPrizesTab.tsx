import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Trophy, Calendar, Edit, Trash2, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Prize {
  id?: string;
  regionConfigId: string;
  month: number;
  year: number;
  rank: number;
  prizeName: string;
  prizeDescription?: string;
  prizeValue?: number;
  goalTarget: number;
  createdAt?: Date;
}

interface RegionConfig {
  id: string;
  region: string;
  category: string;
  level?: string;
}

const MONTHS = [
  { value: 1, label: "Enero" },
  { value: 2, label: "Febrero" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Mayo" },
  { value: 6, label: "Junio" },
  { value: 7, label: "Julio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },
  { value: 12, label: "Diciembre" },
];

export default function MonthlyPrizesTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedRegion, setSelectedRegion] = useState<string>("");

  // Helper para obtener regionConfigId inicial
  const getInitialRegionConfigId = () => {
    // Si hay un usuario y configuraciones de región disponibles
    if (currentUser && regionConfigs && regionConfigs.length > 0) {
      if ((currentUser as any).role === "regional-admin") {
        const userRegion = (currentUser as any).region;
        const matchingConfig = regionConfigs.find(config => config.region === userRegion);
        return matchingConfig?.id || "";
      } else if ((currentUser as any).role === "admin" || (currentUser as any).role === "super-admin") {
        // Para admin/super-admin, usar la primera configuración disponible como default
        return regionConfigs[0]?.id || "";
      }
    }
    return "";
  };

  const [prize, setPrize] = useState<Prize>({
    regionConfigId: "",
    month: new Date().getMonth() + 1,
    year: currentYear,
    rank: 1,
    prizeName: "",
    prizeDescription: "",
    prizeValue: undefined,
    goalTarget: 0,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState<number>(currentYear);

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

  // Fetch region configs - SIMPLE: solo obtener configs de la región actual
  const { data: regionConfigs, isLoading: configsLoading } = useQuery<RegionConfig[]>({
    queryKey: ["/api/admin/region-configs", selectedRegion],
    queryFn: async () => {
      const response = await fetch("/api/admin/region-configs", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch region configs");
      const allConfigs = await response.json();
      // SIMPLE: solo filtrar por región actual, sin deduplicar
      return allConfigs.filter((config: any) => config.region === selectedRegion);
    },
    enabled: !!selectedRegion,
  });

  // Sincronizar regionConfigId basado en selectedRegion
  useEffect(() => {
    if (selectedRegion && regionConfigs && regionConfigs.length > 0) {
      // Encontrar el regionConfig que corresponde a la región seleccionada
      const matchingConfig = regionConfigs.find(config => config.region === selectedRegion);
      if (matchingConfig && matchingConfig.id !== prize.regionConfigId) {
        setPrize(prev => ({
          ...prev,
          regionConfigId: matchingConfig.id
        }));
      }
    }
  }, [selectedRegion, regionConfigs, prize.regionConfigId]);

  // SIMPLE: Inicializar con la primera categoría disponible
  useEffect(() => {
    if (regionConfigs && regionConfigs.length > 0 && !prize.regionConfigId) {
      setPrize(prev => ({
        ...prev,
        regionConfigId: regionConfigs[0].id
      }));
    }
  }, [regionConfigs, prize.regionConfigId]);

  // SIMPLE: Helper para reset
  const getCurrentRegionConfigId = () => {
    return regionConfigs && regionConfigs.length > 0 ? regionConfigs[0].id : "";
  };

  // Fetch monthly prizes
  const { data: allPrizes, isLoading: prizesLoading } = useQuery<Prize[]>({
    queryKey: ["/api/admin/monthly-prizes", filterMonth, filterYear, selectedRegion],
    enabled: !!selectedRegion,
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/monthly-prizes?month=${filterMonth}&year=${filterYear}&region=${selectedRegion}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch prizes");
      return response.json();
    },
  });

  // Create/Update prize mutation
  const savePrizeMutation = useMutation({
    mutationFn: async (data: Prize) => {
      const url = editingId
        ? `/api/admin/monthly-prizes/${editingId}`
        : "/api/admin/monthly-prizes";
      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || t("admin.errorSavingPrize"));
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/monthly-prizes", filterMonth, filterYear, selectedRegion] });
      setEditingId(null);
      setPrize({
        regionConfigId: getCurrentRegionConfigId(),
        month: new Date().getMonth() + 1,
        year: currentYear,
        rank: 1,
        prizeName: "",
        prizeDescription: "",
        prizeValue: undefined,
        goalTarget: 0,
      });
      toast({
        title: t("admin.prizeSaved"),
        description: t("admin.prizeSavedSuccessfully"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.couldNotSavePrize"),
        variant: "destructive",
      });
    },
  });

  // Delete prize mutation
  const deletePrizeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/monthly-prizes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || t("admin.errorDeletingPrize"));
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/monthly-prizes", filterMonth, filterYear, selectedRegion] });
      toast({
        title: t("admin.prizeDeleted"),
        description: t("admin.prizeDeletedSuccessfully"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("admin.couldNotDeletePrize"),
        variant: "destructive",
      });
    },
  });

  const handleSavePrize = () => {
    if (!prize.regionConfigId || !prize.prizeName || prize.goalTarget === undefined) {
      toast({
        title: t("admin.requiredFields"),
        description: "Por favor completa todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }
    savePrizeMutation.mutate(prize);
  };

  const handleEditPrize = (prizeToEdit: Prize) => {
    setEditingId(prizeToEdit.id || null);
    setPrize({
      regionConfigId: prizeToEdit.regionConfigId,
      month: prizeToEdit.month,
      year: prizeToEdit.year,
      rank: prizeToEdit.rank,
      prizeName: prizeToEdit.prizeName,
      prizeDescription: prizeToEdit.prizeDescription || "",
      prizeValue: prizeToEdit.prizeValue,
      goalTarget: prizeToEdit.goalTarget,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setPrize({
      regionConfigId: getCurrentRegionConfigId(),
      month: new Date().getMonth() + 1,
      year: currentYear,
      rank: 1,
      prizeName: "",
      prizeDescription: "",
      prizeValue: undefined,
      goalTarget: 0,
    });
  };

  const handleDeletePrize = (id: string) => {
    deletePrizeMutation.mutate(id);
  };

  const getRegionName = (regionConfigId: string) => {
    const config = regionConfigs?.find((c) => c.id === regionConfigId);
    if (!config) return "Desconocido";
    return `${config.region} - ${config.category}${config.level ? ` (${config.level})` : ""}`;
  };

  if (configsLoading || prizesLoading) {
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
            <h3 className="text-sm font-medium text-gray-900 mb-2">{t("admin.region")}</h3>
            {currentUser && (currentUser as any).role === "regional-admin" ? (
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {selectedRegion}
                </Badge>
                <span className="text-xs text-gray-500">
                  ({t('admin.regionalAdminMonthlyPrizesInfo')})
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
                  {t('admin.selectRegionToManagePrizes')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Formulario de Premio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            {editingId ? t('admin.editMonthlyPrize') : t('admin.createMonthlyAcceleratorPrize')}
          </CardTitle>
          <CardDescription>
            {t('admin.defineMonthlyPrizesDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Categoría - SIMPLE */}
          <div className="space-y-2">
            <Label htmlFor="region-config">
              {t('admin.category')} *
            </Label>
            {configsLoading ? (
              <div className="p-3 bg-gray-50 border rounded-md text-sm text-gray-500">
                {t('common.loading')}
              </div>
            ) : !regionConfigs || regionConfigs.length === 0 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
                No hay categorías para {selectedRegion}
              </div>
            ) : (
              // SIMPLE: Solo un selector, sin complicaciones
              <Select
                value={prize.regionConfigId}
                onValueChange={(value) => setPrize({ ...prize, regionConfigId: value })}
              >
                <SelectTrigger id="region-config">
                  <SelectValue placeholder={t("admin.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {regionConfigs?.map((config) => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.category}
                      {(config as any).subcategory && ` - ${(config as any).subcategory}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Mes y Año */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Mes *</Label>
              <Select
                value={prize.month.toString()}
                onValueChange={(value) => setPrize({ ...prize, month: parseInt(value) })}
              >
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">{t("admin.yearRequired")}</Label>
              <Input
                id="year"
                type="number"
                value={prize.year}
                onChange={(e) => setPrize({ ...prize, year: parseInt(e.target.value) })}
                min={2024}
                max={2030}
              />
            </div>
          </div>

          {/* Goals Target to Participate */}
          <div className="space-y-2">
            <Label htmlFor="goalTarget">{t("admin.goalTargetRequired")}</Label>
            <Input
              id="goalTarget"
              type="number"
              value={prize.goalTarget}
              onChange={(e) => setPrize({ ...prize, goalTarget: parseInt(e.target.value) })}
              min={0}
              placeholder="10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prizeName">{t("admin.prizeNameLabel")}</Label>
            <Input
              id="prizeName"
              value={prize.prizeName}
              onChange={(e) => setPrize({ ...prize, prizeName: e.target.value })}
              placeholder={t("admin.prizeNamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("admin.prizeDescriptionOptional")}</Label>
            <Input
              id="description"
              value={prize.prizeDescription}
              onChange={(e) => setPrize({ ...prize, prizeDescription: e.target.value })}
              placeholder={t("admin.prizeDescriptionPlaceholder")}
            />
          </div>

          {/* Position in ranking */}
          <div className="space-y-2">
            <Label htmlFor="rank">{t("admin.positionTopRequired")}</Label>
            <Input
              id="rank"
              type="number"
              value={prize.rank}
              onChange={(e) => setPrize({ ...prize, rank: parseInt(e.target.value) })}
              min={1}
              max={10}
              placeholder="1"
            />
          </div>

          <Separator />

          {/* Botones */}
          <div className="flex gap-2">
            <Button onClick={handleSavePrize} disabled={savePrizeMutation.isPending} className="flex-1">
              <Plus className="w-4 h-4 mr-2" />
              {savePrizeMutation.isPending
                ? t('common.saving')
                : editingId
                ? t('admin.updatePrize')
                : t('admin.createPrize')}
            </Button>
            {editingId && (
              <Button onClick={handleCancelEdit} variant="outline" className="flex-1">
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t("admin.configuredPrizes")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Select
              value={filterMonth.toString()}
              onValueChange={(value) => setFilterMonth(parseInt(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value.toString()}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              className="w-[120px]"
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              min={2024}
              max={2030}
            />
          </div>

          {allPrizes && allPrizes.length > 0 ? (
            <div className="space-y-3">
              {allPrizes.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">Top {p.rank}</Badge>
                      <p className="font-medium">{p.prizeName}</p>
                      {p.prizeValue && (
                        <Badge variant="secondary">${p.prizeValue.toLocaleString()}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{getRegionName(p.regionConfigId)}</span>
                      <span>•</span>
                      <span>Meta: {p.goalTarget} goles</span>
                      {p.prizeDescription && (
                        <>
                          <span>•</span>
                          <span className="italic">{p.prizeDescription}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditPrize(p)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("admin.deletePrize")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("admin.deletePrizeConfirmation")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeletePrize(p.id!)}
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
              {t("admin.noPrizesConfiguredFor")} {MONTHS.find((m) => m.value === filterMonth)?.label} {filterYear}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
