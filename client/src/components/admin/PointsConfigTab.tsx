import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Settings, DollarSign, Trophy, Calendar, Target, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { apiRequest } from "@/lib/queryClient";
import type { PointsConfig } from "@shared/schema";

const pointsConfigFormSchema = z.object({
  region: z.string().min(1, { message: "validation.regionRequired" }),
  newCustomerRate: z.number().min(1, "Debe ser al menos 1").max(1000000, "Valor muy alto"),
  renewalRate: z.number().min(1, "Debe ser al menos 1").max(1000000, "Valor muy alto"),
  grandPrizeThreshold: z.number().min(1, "Debe ser al menos 1").max(10000000, "Valor muy alto"),
  defaultNewCustomerGoalRate: z.number().min(1, "Debe ser al menos 1").max(1000000, "Valor muy alto"),
  defaultRenewalGoalRate: z.number().min(1, "Debe ser al menos 1").max(1000000, "Valor muy alto"),
});

type PointsConfigForm = z.infer<typeof pointsConfigFormSchema>;

export default function PointsConfigTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  // Estado para la región seleccionada
  const [selectedRegion, setSelectedRegion] = useState<string>("");

  // Query para obtener el usuario actual
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  // Determinar región basada en el rol del usuario
  useEffect(() => {
    if (currentUser) {
      const user = currentUser as any;
      if (user.role === "regional-admin") {
        // Regional-admin solo puede ver su región
        const userRegion = user.region || user.country || "";
        setSelectedRegion(userRegion);
      } else {
        // Admin/Super-admin pueden seleccionar cualquier región, por defecto NOLA
        setSelectedRegion(selectedRegion || "NOLA");
      }
    }
  }, [currentUser]);

  const { data: config, isLoading } = useQuery<PointsConfig>({
    queryKey: ["/api/admin/points-config", selectedRegion],
    enabled: !!selectedRegion,
    queryFn: async () => {
      const response = await fetch(`/api/admin/points-config?region=${selectedRegion}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch points configuration");
      }
      return response.json();
    },
  });

  const form = useForm<PointsConfigForm>({
    resolver: zodResolver(pointsConfigFormSchema),
    defaultValues: {
      region: "",
      newCustomerRate: 1000,
      renewalRate: 2000,
      grandPrizeThreshold: 50000,
      defaultNewCustomerGoalRate: 1000,
      defaultRenewalGoalRate: 2000,
    },
  });

  useEffect(() => {
    if (config && selectedRegion) {
      form.reset({
        region: selectedRegion,
        newCustomerRate: (config as any).newCustomerRate || 1000,
        renewalRate: (config as any).renewalRate || 2000,
        grandPrizeThreshold: config.grandPrizeThreshold,
        defaultNewCustomerGoalRate: (config as any).defaultNewCustomerGoalRate || 1000,
        defaultRenewalGoalRate: (config as any).defaultRenewalGoalRate || 2000,
      });
    } else if (selectedRegion) {
      // Si no hay config pero hay región seleccionada, establecer la región en el formulario
      form.setValue("region", selectedRegion);
    }
  }, [config, selectedRegion, form]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: PointsConfigForm) => {
      const payload = {
        region: data.region,
        newCustomerRate: data.newCustomerRate,
        renewalRate: data.renewalRate,
        grandPrizeThreshold: data.grandPrizeThreshold,
        defaultNewCustomerGoalRate: data.defaultNewCustomerGoalRate,
        defaultRenewalGoalRate: data.defaultRenewalGoalRate,
      };
      const response = await apiRequest("PATCH", "/api/admin/points-config", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/points-config", selectedRegion] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/points-config"] }); // Para cachés generales
      toast({
        title: t("admin.configurationUpdated"),
        description: `Las reglas de asignación de puntos para ${selectedRegion} han sido actualizadas exitosamente`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || t("admin.couldNotUpdateConfiguration"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PointsConfigForm) => {
    updateConfigMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-points-config-title">
          {t('admin.settings')}
        </h2>
        <p className="text-muted-foreground" data-testid="text-points-config-description">
          {t('admin.configurePointsRules')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('admin.pointsAssignmentRules')}
          </CardTitle>
          <CardDescription>
            {t('admin.configurePointsRules')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Selector de región */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">{t("admin.configurationForRegion")}</Label>
                    <p className="text-xs text-gray-600 mt-1">
                      {(currentUser as any)?.role === "regional-admin" 
                        ? t("admin.regionalAdminConfigNote")
                        : t("admin.selectRegionToConfig")
                      }
                    </p>
                  </div>
                  {(currentUser as any)?.role === "regional-admin" ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                        {selectedRegion}
                      </span>
                      <span className="text-xs text-gray-500">({t("admin.assignedRegion")})</span>
                    </div>
                  ) : (
                    <Select
                      value={selectedRegion}
                      onValueChange={(value) => setSelectedRegion(value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder={t("admin.selectRegionPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NOLA">NOLA</SelectItem>
                        <SelectItem value="SOLA">SOLA</SelectItem>
                        <SelectItem value="BRASIL">BRASIL</SelectItem>
                        <SelectItem value="MEXICO">MEXICO</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              
              <div className="border-t pt-6">
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      {t('admin.pointsAssignmentByDealType')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.pointsAssignmentByDealTypeDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="newCustomerRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-blue-500" />
                              {t('deals.newCustomer')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1000"
                                data-testid="input-new-customer-rate"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>{t('admin.dollarsPerPoint')}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="renewalRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-purple-500" />
                              {t('deals.renewal')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="2000"
                                data-testid="input-renewal-rate"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>{t('admin.dollarsPerPoint')}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="border-t pt-6">
                <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5 text-emerald-600" />
                      {t('admin.goalAccumulationRules')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.goalAccumulationDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="defaultNewCustomerGoalRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-emerald-500" />
                              {t('admin.newCustomer')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1000"
                                data-testid="input-new-customer-goal-rate"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>{t('admin.newCustomer')} - {t('admin.dollarsPerPoint')}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="defaultRenewalGoalRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-teal-500" />
                              {t('admin.renewal')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="2000"
                                data-testid="input-renewal-goal-rate"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>{t('admin.renewal')} - {t('admin.dollarsPerPoint')}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="border-t pt-6">
                <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5 text-yellow-600" />
                      {t('admin.grandPrize')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.grandPrizeDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="grandPrizeThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('admin.grandPrizeThreshold')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50000"
                              data-testid="input-grand-prize-threshold"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('admin.totalPointsNeeded')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={updateConfigMutation.isPending}
                  data-testid="button-reset"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={updateConfigMutation.isPending}
                  data-testid="button-save-config"
                >
                  {updateConfigMutation.isPending ? t('admin.saving') : t('admin.saveChanges')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {config?.updatedAt && (
        <div className="text-sm text-muted-foreground text-center">
          Última actualización: {new Date(config.updatedAt).toLocaleString("es-ES")}
        </div>
      )}
    </div>
  );
}
