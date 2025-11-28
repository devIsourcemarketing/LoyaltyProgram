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

// Tipo para la jerarquía de regiones desde la API
type RegionHierarchy = Record<string, {
  categories: Record<string, string[]>
}>;

const passwordlessRegisterSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  country: z.string().optional(),
  city: z.string().optional(),
  region: z.enum(["NOLA", "SOLA", "BRASIL", "MEXICO"], {
    required_error: "La región es requerida",
  }),
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
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
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
      country: "",
      city: "",
      region: undefined,
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

  // Actualizar categorías disponibles cuando se selecciona una región
  useEffect(() => {
    if (selectedRegion && regionHierarchy) {
      const categories = Object.keys(regionHierarchy[selectedRegion]?.categories || {});
      setAvailableCategories(categories);
      
      // Reset category y subcategory
      setSelectedCategory("");
      form.setValue("category", "" as any);
      setAvailableSubcategories([]);
    } else {
      setAvailableCategories([]);
      setAvailableSubcategories([]);
    }
  }, [selectedRegion, regionHierarchy, form]);

  // Actualizar subcategorías disponibles cuando se selecciona una categoría
  useEffect(() => {
    if (selectedRegion && selectedCategory && regionHierarchy) {
      const subcategories = regionHierarchy[selectedRegion]?.categories[selectedCategory] || [];
      setAvailableSubcategories(subcategories);
    } else {
      setAvailableSubcategories([]);
    }
  }, [selectedCategory, selectedRegion, regionHierarchy]);

  // Actualizar países disponibles cuando se selecciona una región (usando REGION_HIERARCHY para países/ciudades)
  useEffect(() => {
    if (selectedRegion) {
      const countries = Object.keys(REGION_HIERARCHY[selectedRegion] || {});
      setAvailableCountries(countries);
      
      // Si solo hay un país (vacío o específico), seleccionarlo automáticamente
      if (countries.length === 1) {
        setSelectedCountry(countries[0]);
        form.setValue("country", countries[0]);
      } else {
        setSelectedCountry("");
        form.setValue("country", "");
      }
      
      setSelectedCity("");
      form.setValue("city", "");
      setAvailableCities([]);
    } else {
      setAvailableCountries([]);
      setSelectedCountry("");
      setSelectedCity("");
      setAvailableCities([]);
    }
  }, [selectedRegion, form]);

  // Actualizar ciudades disponibles cuando se selecciona un país
  useEffect(() => {
    if (selectedRegion && selectedCountry !== undefined) {
      const cities = REGION_HIERARCHY[selectedRegion]?.[selectedCountry] || [];
      setAvailableCities(cities);
      
      // Reset ciudad seleccionada
      setSelectedCity("");
      form.setValue("city", "");
    }
  }, [selectedCountry, selectedRegion, form]);

  const registerMutation = useMutation({
    mutationFn: async (userData: PasswordlessRegisterForm) => {
      // Construir el valor de country basado en la selección
      let finalCountry = "";
      if (userData.country && userData.country !== "") {
        // Si hay país específico (NOLA: COLOMBIA, CENTRO AMERICA; SOLA: ARGENTINA, CHILE, PERU, OTROS)
        if (userData.city) {
          finalCountry = `${userData.country} - ${userData.city}`;
        } else {
          finalCountry = userData.country;
        }
      } else if (userData.city) {
        // BRASIL o MÉXICO (sin país intermedio, solo ciudad)
        finalCountry = userData.city;
      }

      const response = await fetch("/api/auth/register-passwordless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...userData,
          country: finalCountry,
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
        title: "¡Registro exitoso! 🎉",
        description: data.message || "Te hemos enviado un email de bienvenida con tu enlace de acceso.",
      });
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
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

  const countries = [
    { value: "US", label: "Estados Unidos" },
    { value: "CA", label: "Canadá" },
    { value: "MX", label: "México" },
    { value: "BR", label: "Brasil" },
    { value: "AR", label: "Argentina" },
    { value: "CL", label: "Chile" },
    { value: "CO", label: "Colombia" },
    { value: "PE", label: "Perú" },
    { value: "EC", label: "Ecuador" },
    { value: "VE", label: "Venezuela" },
  ];

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
      
      {isLoadingHierarchy ? (
        <Card className="relative z-20 w-full max-w-md bg-white/95 backdrop-blur-sm">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#29CCB1] mb-4" />
            <p className="text-gray-600">Cargando formulario de registro...</p>
          </CardContent>
        </Card>
      ) : (
      <Card className="relative z-20 w-full max-w-2xl bg-white/95 backdrop-blur-sm background-form-login">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={kasperskyLogo} alt="Kaspersky Cup" className="w-auto" />
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1B] mb-2">
            Passwordless Registration
          </h2>
          <p className="text-lg font-semibold text-[#29CCB1]">
            Complete your information to access Kaspersky Cup
          </p>
          <p className="text-sm text-gray-600 mt-2">
            You will receive an email with a link to access your account
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
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="email@example.com" 
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
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
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
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" {...field} />
                      </FormControl>
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
                    <FormLabel>Region *</FormLabel>
                    <Select
                      value={selectedRegion}
                      onValueChange={(value) => {
                        setSelectedRegion(value);
                        form.setValue("region", value as any, { shouldValidate: true });
                        setSelectedCategory(""); // Reset category when region changes
                        form.setValue("category", "" as any, { shouldValidate: false });
                        form.setValue("subcategory", "", { shouldValidate: false });
                      }}
                      disabled={registerMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your region" />
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

              {/* Mostrar selector de país solo si la región tiene países */}
              {selectedRegion && availableCountries.length > 0 && availableCountries[0] !== "" && (
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {selectedRegion === "NOLA" ? "Subcategoría" : "País"} *
                      </FormLabel>
                      <Select
                        value={selectedCountry}
                        onValueChange={(value) => {
                          setSelectedCountry(value);
                          form.setValue("country", value);
                        }}
                        disabled={registerMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedRegion === "NOLA" ? "Selecciona subcategoría" : "Selecciona tu país"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCountries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Mostrar selector de ciudad si hay ciudades disponibles */}
              {selectedRegion && availableCities.length > 0 && (
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad (Opcional)</FormLabel>
                      <Select
                        value={selectedCity}
                        onValueChange={(value) => {
                          setSelectedCity(value);
                          form.setValue("city", value);
                        }}
                        disabled={registerMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona tu ciudad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Category */}
              {selectedRegion && availableCategories.length > 0 && (
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría *</FormLabel>
                      <Select
                        value={selectedCategory}
                        onValueChange={(value) => {
                          setSelectedCategory(value);
                          form.setValue("category", value as any, { shouldValidate: true });
                          form.setValue("subcategory", "", { shouldValidate: false });
                        }}
                        disabled={registerMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona tu categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Subcategory - Mostrar solo si hay subcategorías disponibles */}
              {selectedRegion && selectedCategory && availableSubcategories.length > 0 && (
                <FormField
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {selectedRegion === "MEXICO" ? "Nivel de Partner *" : "Subcategoría *"}
                      </FormLabel>
                      <Select
                        onValueChange={(value) => form.setValue("subcategory", value)}
                        disabled={registerMutation.isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedRegion === "MEXICO" ? "Selecciona nivel" : "Selecciona subcategoría"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSubcategories.map((subcategory) => (
                            <SelectItem key={subcategory} value={subcategory}>
                              {subcategory}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Info Alert */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> You will receive a welcome email with an access link. 
                  Your account will be activated once approved by an administrator.
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
                    Registering...
                  </>
                ) : (
                  "Complete Registration"
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
                  ← Back to login
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
