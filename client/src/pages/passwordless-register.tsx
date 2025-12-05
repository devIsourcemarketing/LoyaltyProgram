import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertCircle, Loader2 } from "lucide-react";
import backgroundImage from "@assets/login.jpg";
import kasperskyLogo from "@/assets/logo-kaspersky-cup.png";
import { REGION_HIERARCHY } from "@/../../shared/constants";
import { LanguageSelector } from "@/components/LanguageSelector";

// Tipo para la jerarquía de regiones desde la API
type RegionHierarchy = Record<string, {
  subcategories: string[]
}>;

const passwordlessRegisterSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  companyName: z.string().min(1, "El nombre de la empresa es requerido"),
  partnerCategory: z.string().min(1, "La categoría del partner es requerida"),
  marketSegment: z.string().min(1, "El segmento del mercado es requerido"),
  region: z.enum(["NOLA", "SOLA", "BRASIL", "MEXICO"], {
    required_error: "La región es requerida",
  }),
  country: z.string().min(1, "El país es requerido"),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  contactNumber: z.string().optional(),
  category: z.enum(["ENTERPRISE", "SMB", "MSSP"], {
    required_error: "La categoría es requerida",
  }),
  subcategory: z.string().optional(),
});

type PasswordlessRegisterForm = z.infer<typeof passwordlessRegisterSchema>;

export default function PasswordlessRegister() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [prefilledEmail, setPrefilledEmail] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedMarketSegment, setSelectedMarketSegment] = useState<string>("");
  const [availableSubcategories, setAvailableSubcategories] = useState<string[]>([]);

  // Obtener jerarquía de regiones desde la API
  const { data: regionHierarchy, isLoading: isLoadingHierarchy } = useQuery<RegionHierarchy>({
    queryKey: ["/api/region-hierarchy"],
    queryFn: async () => {
      const response = await fetch("/api/region-hierarchy");
      if (!response.ok) throw new Error("Failed to load region hierarchy");
      return response.json();
    },
  });

  const form = useForm<PasswordlessRegisterForm>({
    resolver: zodResolver(passwordlessRegisterSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      companyName: "",
      partnerCategory: "",
      marketSegment: "",
      region: undefined,
      country: "",
      address: "",
      city: "",
      zipCode: "",
      contactNumber: "",
      category: undefined,
      subcategory: "",
    },
  });

  // Obtener email de URL params si viene del magic link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setPrefilledEmail(emailParam);
      form.setValue("email", emailParam);
    }
  }, [form]);

  // Actualizar subcategorías disponibles cuando se selecciona una región
  useEffect(() => {
    if (selectedRegion && regionHierarchy) {
      const subcategories = regionHierarchy[selectedRegion]?.subcategories || [];
      setAvailableSubcategories(subcategories);
      // Resetear subcategory cuando cambia la región
      form.setValue("subcategory", "");
    } else {
      setAvailableSubcategories([]);
    }
  }, [selectedRegion, regionHierarchy, form]);

  const registerMutation = useMutation({
    mutationFn: async (userData: PasswordlessRegisterForm) => {
      // Obtener idioma del localStorage
      const savedLanguage = localStorage.getItem('preferred-language') || 'es';

      const response = await fetch("/api/auth/register-passwordless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...userData,
          language: savedLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error en el registro");
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: t("auth.registrationCompleted"),
        description: data.message || t("auth.registrationPendingApproval"),
        duration: 5000,
      });
      
      // Mostrar mensaje adicional de notificación
      setTimeout(() => {
        toast({
          description: t("auth.youWillBeNotified"),
          duration: 5000,
        });
      }, 1000);
      
      // Redirigir al login después de 4 segundos
      setTimeout(() => {
        setLocation("/login");
      }, 4000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al registrar usuario",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PasswordlessRegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Image Background */}
      <img
        src={backgroundImage}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 z-10"></div>
      
      {/* Language Selector - Top Right */}
      <div className="absolute top-4 right-4 z-30">
        <LanguageSelector />
      </div>
      
      {isLoadingHierarchy ? (
        <Card className="relative z-20 w-full max-w-md bg-white/95 backdrop-blur-sm">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#29CCB1] mb-4" />
            <p className="text-gray-600">{t("auth.loadingRegistrationForm")}</p>
          </CardContent>
        </Card>
      ) : (
      <Card className="relative z-20 w-full max-w-2xl bg-white/95 backdrop-blur-sm background-form-login">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={kasperskyLogo} alt="Kaspersky Cup" className="w-auto" />
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1B] mb-2">
            {t("auth.passwordlessRegistration")}
          </h2>
          <p className="text-lg font-semibold text-[#29CCB1]">
            {t("auth.completeYourInformation")}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {t("auth.youWillReceiveEmail")}
          </p>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.emailLabel")} *</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder={t("auth.emailPlaceholderSimple")} 
                        {...field}
                        readOnly={!!prefilledEmail}
                        disabled={!!prefilledEmail}
                        className={prefilledEmail ? "bg-gray-100 cursor-not-allowed" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.firstNameLabel")} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t("auth.firstNamePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.lastNameLabel")} *</FormLabel>
                      <FormControl>
                        <Input placeholder={t("auth.lastNamePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Nombre de la Empresa */}
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.companyName")} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t("auth.companyNamePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Categoría del Partner y Segmento del Mercado */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="partnerCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.partnerCategory")} *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={registerMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("auth.selectPartnerCategory")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PLATINUM">PLATINUM</SelectItem>
                          <SelectItem value="GOLD">GOLD</SelectItem>
                          <SelectItem value="SILVER">SILVER</SelectItem>
                          <SelectItem value="REGISTERED">REGISTERED</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="marketSegment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.marketSegment")} *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedMarketSegment(value);
                          form.setValue("category", value as any, { shouldValidate: true });
                        }}
                        disabled={registerMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("auth.selectMarketSegment")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                          <SelectItem value="SMB">SMB</SelectItem>
                          <SelectItem value="MSSP">MSSP</SelectItem>
                          <SelectItem value="N/A">N/A</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Region */}
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.regionLabel")} *</FormLabel>
                    <Select
                      value={selectedRegion}
                      onValueChange={(value) => {
                        setSelectedRegion(value);
                        form.setValue("region", value as any, { shouldValidate: true });
                        // Solo resetear subcategory, el market segment es independiente de la región
                        form.setValue("subcategory", "", { shouldValidate: false });
                        
                        // Auto-llenar país si es Brasil o México
                        if (value === "BRASIL") {
                          form.setValue("country", "BRASIL", { shouldValidate: true });
                          setSelectedCountry("BRASIL");
                        } else if (value === "MEXICO") {
                          form.setValue("country", "MÉXICO", { shouldValidate: true });
                          setSelectedCountry("MÉXICO");
                        }
                      }}
                      disabled={registerMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("auth.selectYourRegion")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NOLA">NOLA (Norte de América Latina)</SelectItem>
                        <SelectItem value="SOLA">SOLA (Sur de América Latina)</SelectItem>
                        <SelectItem value="BRASIL">Brasil</SelectItem>
                        <SelectItem value="MEXICO">México</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subcategoría - Solo mostrar para región NOLA */}
              {selectedRegion === "NOLA" && (
                <FormField
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.subcategoryLabel")} *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => form.setValue("subcategory", value)}
                        disabled={registerMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("auth.selectYourSubcategory")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSubcategories.length > 0 ? (
                            availableSubcategories.map((subcategory) => (
                              <SelectItem key={subcategory} value={subcategory}>
                                {subcategory}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="N/A" disabled>No hay subcategorías disponibles</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* País */}
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.countryLabel")} *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={registerMutation.isPending || selectedRegion === "BRASIL" || selectedRegion === "MEXICO"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("auth.selectYourCountry")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ARGENTINA">ARGENTINA</SelectItem>
                        <SelectItem value="BOLIVIA">BOLIVIA</SelectItem>
                        <SelectItem value="BRASIL">BRASIL</SelectItem>
                        <SelectItem value="CHILE">CHILE</SelectItem>
                        <SelectItem value="COLOMBIA">COLOMBIA</SelectItem>
                        <SelectItem value="COSTA RICA">COSTA RICA</SelectItem>
                        <SelectItem value="ECUADOR">ECUADOR</SelectItem>
                        <SelectItem value="EL SALVADOR">EL SALVADOR</SelectItem>
                        <SelectItem value="GUATEMALA">GUATEMALA</SelectItem>
                        <SelectItem value="HONDURAS">HONDURAS</SelectItem>
                        <SelectItem value="MÉXICO">MÉXICO</SelectItem>
                        <SelectItem value="NICARAGUA">NICARAGUA</SelectItem>
                        <SelectItem value="PANAMÁ">PANAMÁ</SelectItem>
                        <SelectItem value="PARAGUAY">PARAGUAY</SelectItem>
                        <SelectItem value="PERÚ">PERÚ</SelectItem>
                        <SelectItem value="URUGUAY">URUGUAY</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dirección, Ciudad, Código Postal */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.addressLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("auth.addressPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.cityLabel")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("auth.cityPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.zipCodeLabel")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("auth.zipCodePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Número de Contacto */}
              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.contactNumberLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("auth.contactNumberPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Info Alert */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {t("auth.importantNotice")}
                </AlertDescription>
              </Alert>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-[#29CCB1] hover:bg-[#23B39E] text-white"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("auth.completingRegistration")}
                  </>
                ) : (
                  t("auth.completeRegistration")
                )}
              </Button>

              {/* Back to Login */}
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-[#29CCB1] hover:text-[#23B39E]"
                  onClick={() => setLocation("/login")}
                >
                  {t("auth.backToLogin")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
