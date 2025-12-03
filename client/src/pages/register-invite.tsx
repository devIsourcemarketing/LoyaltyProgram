import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { REGION_HIERARCHY, PARTNER_CATEGORIES, MARKET_SEGMENTS } from "@/../../shared/constants";
import { useQuery } from "@tanstack/react-query";
import { LanguageSelector } from "@/components/LanguageSelector";

// Tipo para la jerarquía de regiones desde la API
type RegionHierarchy = Record<string, {
  categories: Record<string, string[]>
}>;

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  companyName: z.string().optional(),
  partnerCategory: z.string().optional(),
  marketSegment: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  zipCode: z.string().optional(),
  contactNumber: z.string().optional(),
  region: z.string().min(1, "validation.regionRequired"),
  category: z.string().min(1, "validation.categoryRequired"),
  subcategory: z.string().optional(),
}).refine((data) => {
  // Si se proporciona password, debe tener mínimo 6 caracteres
  if (data.password && data.password.trim() !== "") {
    return data.password.length >= 6;
  }
  return true;
}, {
  message: "Password must be at least 6 characters",
  path: ["password"],
}).refine((data) => {
  // Si hay password, confirmPassword debe coincidir
  if (data.password && data.password.trim() !== "") {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterWithInvite() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/register");
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);

  // Obtener jerarquía de regiones desde la API
  const { data: regionHierarchy } = useQuery<RegionHierarchy>({
    queryKey: ["/api/region-hierarchy"],
    queryFn: async () => {
      const response = await fetch("/api/region-hierarchy");
      if (!response.ok) throw new Error("Failed to load region hierarchy");
      return response.json();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  // Extract token from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get("token");
    
    if (!inviteToken) {
      toast({
        title: t("validation.tokenNotFound"),
        description: t("validation.invalidTokenDescription"),
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setToken(inviteToken);
    verifyToken(inviteToken);
  }, []);

  // Actualizar categorías disponibles cuando se selecciona una región
  useEffect(() => {
    if (selectedRegion && regionHierarchy) {
      const categories = Object.keys(regionHierarchy[selectedRegion]?.categories || {});
      setAvailableCategories(categories);
      
      // Reset category y subcategory
      setSelectedCategory("");
      setValue("category", "");
      setAvailableSubcategories([]);
    } else {
      setAvailableCategories([]);
      setAvailableSubcategories([]);
    }
  }, [selectedRegion, regionHierarchy, setValue]);

  // Actualizar subcategorías disponibles cuando se selecciona una categoría
  useEffect(() => {
    if (selectedRegion && selectedCategory && regionHierarchy) {
      const subcategories = regionHierarchy[selectedRegion]?.categories[selectedCategory] || [];
      setAvailableSubcategories(subcategories);
    } else {
      setAvailableSubcategories([]);
    }
  }, [selectedCategory, selectedRegion, regionHierarchy]);

  // Actualizar países disponibles cuando se selecciona una región
  useEffect(() => {
    if (selectedRegion) {
      const countries = Object.keys(REGION_HIERARCHY[selectedRegion] || {});
      setAvailableCountries(countries);
      
      // Si solo hay un país (vacío o específico), seleccionarlo automáticamente
      if (countries.length === 1) {
        setSelectedCountry(countries[0]);
        setValue("country", countries[0]);
      } else {
        setSelectedCountry("");
        setValue("country", "");
      }
      
      setSelectedCity("");
      setValue("city", "");
      setAvailableCities([]);
    } else {
      setAvailableCountries([]);
      setSelectedCountry("");
      setSelectedCity("");
      setAvailableCities([]);
    }
  }, [selectedRegion]);

  // Actualizar ciudades disponibles cuando se selecciona un país
  useEffect(() => {
    if (selectedRegion && selectedCountry !== undefined) {
      const cities = REGION_HIERARCHY[selectedRegion]?.[selectedCountry] || [];
      setAvailableCities(cities);
      
      // Reset ciudad seleccionada
      setSelectedCity("");
      setValue("city", "");
    }
  }, [selectedCountry, selectedRegion]);

  const verifyToken = async (inviteToken: string) => {
    try {
      const response = await fetch(`/api/auth/verify-invite/${inviteToken}`, {
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (data.valid) {
        setIsValid(true);
        setInviteData(data);
        
        // Si es una invitación regional, pre-seleccionar la región y mostrar alerta
        if (data.invitation?.isRegionalInvite && data.invitation.region) {
          setSelectedRegion(data.invitation.region);
          setValue("region", data.invitation.region, { shouldValidate: true });
          
          toast({
            title: t("validation.regionalInvitationTitle"),
            description: t("validation.regionalInvitationDescription").replace("{region}", data.invitation.region),
          });
        }
      } else {
        toast({
          title: t("validation.invalidInvitation"),
          description: data.message || t("validation.invalidInvitationDescription"),
          variant: "destructive",
        });
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: t("auth.couldNotVerifyInvitation"),
        variant: "destructive",
      });
      setTimeout(() => navigate("/login"), 3000);
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = async (data: RegisterForm) => {
    console.log("📝 Iniciando registro...", { username: data.username, token });
    setIsSubmitting(true);
    
    try {
      // 1. PRIMERO cerrar cualquier sesión activa
      console.log("🔓 Cerrando sesión actual si existe...");
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
        console.log("✅ Sesión cerrada");
      } catch (logoutError) {
        console.log("⚠️ No había sesión activa o error al cerrar:", logoutError);
      }

      // 2. LUEGO completar el registro
      console.log("🚀 Enviando petición a /api/auth/register-with-token");
      
      // Construir el valor de country basado en la selección
      let finalCountry = "";
      if (data.country && data.country !== "") {
        // Si hay país específico (NOLA: COLOMBIA, CENTRO AMERICA; SOLA: ARGENTINA, CHILE, PERU, OTROS)
        if (data.city) {
          finalCountry = `${data.country} - ${data.city}`;
        } else {
          finalCountry = data.country;
        }
      } else if (data.city) {
        // BRASIL o MÉXICO (sin país intermedio, solo ciudad)
        finalCountry = data.city;
      }
      
      const response = await fetch("/api/auth/register-with-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          inviteToken: token,
          username: data.username,
          password: data.password,
          country: finalCountry,
          region: data.region,
          category: data.category,
          subcategory: data.subcategory || null,
        }),
      });

      console.log("📬 Respuesta recibida:", response.status);
      const result = await response.json();
      console.log("📄 Datos de respuesta:", result);

      if (!response.ok) {
        throw new Error(result.message || "Error al completar el registro");
      }

      toast({
        title: t("auth.registrationCompleted"),
        description: result.regionAutoAssigned 
          ? `Tu cuenta está lista. Se te asignó automáticamente la región ${result.assignedRegion} desde donde fuiste invitado. Ya puedes iniciar sesión.`
          : result.message || t("auth.accountReady"),
      });

      console.log("✅ Registro exitoso, redirigiendo al login...");
      // Usar window.location.href para forzar recarga completa y limpiar estado
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (error: any) {
      console.error("❌ Error en registro:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo completar el registro",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-4" />
            <p className="text-gray-600">{t("auth.verifyingInvitation")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-center">{t("auth.invalidInvitationTitle")}</CardTitle>
            <CardDescription className="text-center">
              Esta invitación no es válida o ya fue utilizada
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      {/* Language Selector - Top Right */}
      <div className="absolute top-4 right-4 z-30">
        <LanguageSelector />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">{t("auth.completeYourRegistration")}</CardTitle>
          <CardDescription className="text-center">
            {t("auth.welcomeToLoyaltyProgram")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteData && (
            <Alert className="mb-6">
              <AlertDescription>
                <strong>Email:</strong> {inviteData.user.email}<br />
                <strong>Nombre:</strong> {inviteData.user.firstName} {inviteData.user.lastName}
              </AlertDescription>
            </Alert>
          )}

          {inviteData?.invitation?.isRegionalInvite && (
            <Alert className="mb-6 border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>{t("auth.regionalInvitationLabel")}</strong> {t("auth.youHaveBeenInvitedFrom")} <strong>{inviteData.invitation.region}</strong>. 
                {t("auth.yourRegionWillBeAssigned")}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="username">Nombre de Usuario *</Label>
              <Input
                id="username"
                type="text"
                placeholder={t("auth.usernamePlaceholder")}
                {...register("username")}
                disabled={isSubmitting}
              />
              {errors.username && (
                <p className="text-sm text-red-500 mt-1">{errors.username.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="companyName">Nombre de la Empresa</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Nombre de la empresa"
                {...register("companyName")}
                disabled={isSubmitting}
              />
              {errors.companyName && (
                <p className="text-sm text-red-500 mt-1">{errors.companyName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partnerCategory">Categoría del Partner</Label>
                <Controller
                  name="partnerCategory"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {PARTNER_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.partnerCategory && (
                  <p className="text-sm text-red-500 mt-1">{errors.partnerCategory.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="marketSegment">Segmento del Mercado</Label>
                <Controller
                  name="marketSegment"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona segmento" />
                      </SelectTrigger>
                      <SelectContent>
                        {MARKET_SEGMENTS.map((segment) => (
                          <SelectItem key={segment} value={segment}>
                            {segment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.marketSegment && (
                  <p className="text-sm text-red-500 mt-1">{errors.marketSegment.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="password">{t("auth.password")} ({t("common.optional")})</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                {...register("password")}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {t('admin.passwordOptionalHint')}
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">{t("auth.confirmPassword")} ({t("common.optional")})</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t("auth.confirmPasswordPlaceholder")}
                {...register("confirmPassword")}
                disabled={isSubmitting}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="region">
                Región * 
                {inviteData?.invitation?.isRegionalInvite && (
                  <span className="text-blue-600 text-sm ml-2">{t("auth.assignedAutomatically")}</span>
                )}
              </Label>
              <Select
                value={selectedRegion}
                onValueChange={(value) => {
                  setSelectedRegion(value);
                  setValue("region", value, { shouldValidate: true });
                  setSelectedCategory(""); // Reset category when region changes
                  setValue("category", "", { shouldValidate: false });
                  setValue("subcategory", "", { shouldValidate: false });
                }}
                disabled={isSubmitting || inviteData?.invitation?.isRegionalInvite}
              >
                <SelectTrigger className={errors.region ? "border-red-500" : ""}>
                  <SelectValue placeholder={t("auth.selectRegion")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOLA">NOLA (North of Latin America)</SelectItem>
                  <SelectItem value="SOLA">SOLA (South of Latin America)</SelectItem>
                  <SelectItem value="BRASIL">BRASIL</SelectItem>
                  <SelectItem value="MEXICO">MÉXICO</SelectItem>
                </SelectContent>
              </Select>
              {errors.region && (
                <p className="text-sm text-red-500 mt-1">{errors.region.message}</p>
              )}
            </div>

            {/* Mostrar selector de país solo si la región tiene países */}
            {selectedRegion && availableCountries.length > 0 && availableCountries[0] !== "" && (
              <div>
                <Label htmlFor="country">
                  {selectedRegion === "NOLA" ? t("auth.subcategory") : t("common.country")} *
                </Label>
                <Select
                  value={selectedCountry}
                  onValueChange={(value) => {
                    setSelectedCountry(value);
                    setValue("country", value, { shouldValidate: true });
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedRegion === "NOLA" ? t("auth.selectSubcategoryPlaceholder") : t("auth.selectCountryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCountries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Mostrar selector de ciudad si hay ciudades disponibles */}
            {selectedRegion && availableCities.length > 0 && (
              <div>
                <Label htmlFor="city">Ciudad (Opcional)</Label>
                <Select
                  value={selectedCity}
                  onValueChange={(value) => {
                    setSelectedCity(value);
                    setValue("city", value);
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("auth.selectCity")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedRegion && (
              <div>
                <Label htmlFor="category">{t("auth.categoryRequired")}</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setValue("category", value, { shouldValidate: true });
                    setValue("subcategory", "", { shouldValidate: false });
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder={t("auth.selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>
                )}
              </div>
            )}

            {selectedRegion && selectedCategory && availableSubcategories.length > 0 && (
              <div>
                <Label htmlFor="subcategory">
                  {selectedRegion === "MEXICO" ? "Nivel de Partner *" : t("auth.subcategoryRequired")}
                </Label>
                <Select
                  onValueChange={(value) => setValue("subcategory", value, { shouldValidate: true })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      selectedRegion === "MEXICO" ? t("auth.selectLevel") : t("auth.selectSubcategory")
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubcategories.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                type="text"
                placeholder="Dirección completa"
                {...register("address")}
                disabled={isSubmitting}
              />
              {errors.address && (
                <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zipCode">Código Postal</Label>
                <Input
                  id="zipCode"
                  type="text"
                  placeholder="Código postal"
                  {...register("zipCode")}
                  disabled={isSubmitting}
                />
                {errors.zipCode && (
                  <p className="text-sm text-red-500 mt-1">{errors.zipCode.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="contactNumber">Número de Contacto</Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  placeholder="+57 123 456 7890"
                  {...register("contactNumber")}
                  disabled={isSubmitting}
                />
                {errors.contactNumber && (
                  <p className="text-sm text-red-500 mt-1">{errors.contactNumber.message}</p>
                )}
              </div>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                Una vez completado el registro, tu cuenta estará lista para usar inmediatamente.
                Recibirás un email de confirmación.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completando registro...
                </>
              ) : (
                "Completar Registro"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a href="/login" className="text-sm text-primary-600 hover:text-primary-700">
              ¿Ya tienes una cuenta? Inicia sesión
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
