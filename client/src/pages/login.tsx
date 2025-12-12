import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { login, register } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Clock, RefreshCw, ArrowLeft, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import backgroundImage from "@assets/login.jpg";
import kasperskyLogo from "@/assets/logo-kaspersky-cup.png";
import { t } from '@/lib/i18n';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LanguageSelector } from "@/components/LanguageSelector";

const loginSchema = z.object({
  username: z.string().min(1, "validation.usernameRequired"),
  password: z.string().min(1, "validation.passwordRequired"),
});

const registerSchema = z.object({
  username: z.string().min(3, "validation.usernameMinCharacters"),
  email: z.string().email("validation.emailInvalid"),
  password: z.string().min(6, "validation.passwordMinCharacters"),
  firstName: z.string().min(1, "validation.firstNameRequired"),
  lastName: z.string().min(1, "validation.lastNameRequired"),
  country: z.string().min(1, "validation.countryRequired"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function Login() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [emailForLogin, setEmailForLogin] = useState("");
  const [isAdminEmail, setIsAdminEmail] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showMagicLinkSent, setShowMagicLinkSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Temporizador para reenvío (60 segundos)
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      country: "",
    },
    mode: "onChange",
  });

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: LoginForm) => login(username, password),
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("common.loggedInSuccessfully"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("common.loginFailed"),
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (userData: RegisterForm) => register(userData),
    onSuccess: (data: any) => {
      toast({
        title: t("common.success"),
        description: data.message || t("common.accountCreatedSuccessfully"),
      });
      setIsLogin(true);
      registerForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("common.registrationFailed"),
        variant: "destructive",
      });
    },
  });

  const magicLinkMutation = useMutation({
    mutationFn: async (email: string) => {
      // Obtener el idioma seleccionado del localStorage
      const savedLanguage = localStorage.getItem('preferred-language') || 'es';
      
      const response = await fetch("/api/auth/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          email,
          language: savedLanguage // Enviar idioma seleccionado
        }),
      });
      
      const data = await response.json();
      
      // Si el usuario no existe, retornar con flag especial
      if (response.status === 404 && data.userExists === false) {
        return { userExists: false, email, message: data.message };
      }
      
      // Si es admin, debe usar contraseña
      if (response.status === 403 && data.isAdmin) {
        return { isAdmin: true, email, message: data.message };
      }

      // Si requiere contraseña, mostrar campo
      if (response.status === 403 && data.requiresPassword) {
        return { requiresPassword: true, email, message: data.message };
      }
      
      // Si hay otro error, lanzar excepción
      if (!response.ok) {
        throw new Error(data.message || t("common.failedToSendMagicLink"));
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Si el usuario no existe, redirigir a registro sin contraseña
      if (data.userExists === false) {
        // Redirigir a página de registro passwordless con el email
        setLocation(`/passwordless-register?email=${encodeURIComponent(data.email)}`);
        toast({
          title: t('common.registrationRequired'),
          description: t('common.registrationRequiredDesc'),
          variant: "default",
        });
        return;
      }

      // Si es admin, mostrar mensaje y activar campo de contraseña
      if (data.isAdmin) {
        setIsAdminEmail(true);
        loginForm.setValue("username", data.email);
        toast({
          title: t("common.adminAccount"),
          description: t("common.pleaseEnterPasswordToContinue"),
          variant: "default",
        });
        return;
      }

      // Si requiere contraseña (usuario creado por invitación), mostrar campo
      if (data.requiresPassword) {
        setIsAdminEmail(true);
        loginForm.setValue("username", data.email);
        toast({
          title: "Contraseña requerida",
          description: "Por favor, ingrese su contraseña para continuar.",
          variant: "default",
        });
        return;
      }
      
      // Usuario existe y se envió el link
      setSentEmail(data.email || emailForLogin);
      setShowMagicLinkSent(true);
      setResendTimer(60); // 60 segundos para poder reenviar
      setEmailForLogin("");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("common.failedToSendMagicLink"),
        variant: "destructive",
      });
    },
  });

  const onLoginSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  const handleEmailCheck = async (email: string) => {
    if (!email || !email.includes('@')) {
      setIsAdminEmail(false);
      return;
    }
    
    setCheckingEmail(true);
    try {
      const response = await fetch("/api/auth/check-user-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      // Usar el flag requiresPassword del backend
      // Este flag considera: admins O usuarios con isPasswordless = false
      if (data.requiresPassword) {
        setIsAdminEmail(true);
        loginForm.setValue("username", email);
      } else {
        setIsAdminEmail(false);
      }
    } catch (error) {
      // Si falla la verificación, asumir que no requiere contraseña
      setIsAdminEmail(false);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleEmailSubmit = async () => {
    if (!emailForLogin || !emailForLogin.includes('@')) {
      toast({
        title: t("common.error"),
        description: t("common.pleaseEnterValidEmail"),
        variant: "destructive",
      });
      return;
    }

    // Verificar si requiere contraseña ANTES de enviar magic link
    setCheckingEmail(true);
    try {
      const response = await fetch("/api/auth/check-user-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailForLogin }),
      });
      
      const data = await response.json();
      
      // Si requiere contraseña (admin o usuario con contraseña), mostrar campo de contraseña
      if (data.requiresPassword) {
        setIsAdminEmail(true);
        loginForm.setValue("username", emailForLogin);
        toast({
          title: "Contraseña requerida",
          description: "Por favor, ingrese su contraseña para continuar.",
          variant: "default",
        });
        return; // No enviar magic link
      }
      
      // Si no requiere contraseña, enviar magic link
      magicLinkMutation.mutate(emailForLogin);
      
    } catch (error) {
      // Si falla la verificación, intentar enviar magic link de todos modos
      magicLinkMutation.mutate(emailForLogin);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleResendMagicLink = () => {
    if (resendTimer > 0) return;
    magicLinkMutation.mutate(sentEmail);
    setResendTimer(60);
  };

  const handleChangeEmail = () => {
    setShowMagicLinkSent(false);
    setSentEmail("");
    setEmailForLogin("");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const countries = [
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "MX", label: "Mexico" },
    { value: "BR", label: "Brazil" },
    { value: "AR", label: "Argentina" },
    { value: "CL", label: "Chile" },
    { value: "CO", label: "Colombia" },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      {/* Image Background */}
      <img
        src={backgroundImage}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/20 z-10"></div>
      
      {/* Language Selector - Top Right */}
      <div className="absolute top-4 right-4 z-30">
        <LanguageSelector />
      </div>
      
      <Card className="relative z-20 w-full max-w-md bg-white/95 backdrop-blur-sm background-form-login">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={kasperskyLogo} alt="Kaspersky Cup" className="w-auto" />
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1B] mb-2">
            {t('loginScreen.loginMainTitle')}
          </h2>
          <p className="text-lg font-semibold text-[#29CCB1]">
            {t('loginScreen.loginMainSubtitle')}            
          </p>          
          <p className="text-gray-600 mt-2">
            {isLogin ? t('auth.logInToYourAccount') : t('auth.signUp')}
          </p>
        </CardHeader>
        <CardContent>
          {/* Pantalla de "Enlace enviado" */}
          {showMagicLinkSent ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t("auth.checkYourEmail")}
                </h3>
                <p className="text-gray-600 mb-1">
                  {t("auth.magicLinkSentTo")}
                </p>
                <p className="text-lg font-semibold text-gray-900 mb-3">
                  {sentEmail}
                </p>
                <p className="text-sm text-gray-500">
                  {t("auth.openEmailFromDevice")}
                </p>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800">
                  {t("auth.didntReceive")}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResendMagicLink}
                  disabled={resendTimer > 0 || magicLinkMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${magicLinkMutation.isPending ? 'animate-spin' : ''}`} />
                  {resendTimer > 0 
                    ? `${t("auth.resendLinkIn")} ${formatTime(resendTimer)}`
                    : t("auth.resendLink")
                  }
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleChangeEmail}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("auth.changeEmail")}
                </Button>
              </div>
            </div>
          ) : isLogin ? (
            <div className="space-y-4">
              {/* Email input - siempre visible */}
              <div className="space-y-2">
                <Label htmlFor="email-login">{t("auth.emailLabel")}</Label>
                <Input
                  id="email-login"
                  type="email"
                  placeholder={t("auth.yourEmailPlaceholder")}
                  value={emailForLogin}
                  onChange={(e) => {
                    setEmailForLogin(e.target.value);
                    setIsAdminEmail(false);
                  }}
                  onBlur={(e) => handleEmailCheck(e.target.value)}
                  disabled={checkingEmail}
                />
              </div>

              {/* Password field - solo visible si es admin */}
              {isAdminEmail && (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.passwordLabel")}</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t("auth.enterYourPassword")}
                              data-testid="input-password"
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full button-green"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? t("auth.signingIn") : t("auth.signInButton")}
                    </Button>
                  </form>
                </Form>
              )}

              {/* Botón de magic link - solo visible si NO es admin */}
              {!isAdminEmail && emailForLogin && (
                <Button
                  type="button"
                  className="w-full button-green"
                  onClick={handleEmailSubmit}
                  disabled={magicLinkMutation.isPending || checkingEmail}
                >
                  {magicLinkMutation.isPending ? (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      {t("support.submitting")}
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      {t("auth.sendMagicLink")}
                    </>
                  )}
                </Button>
              )}

              {!emailForLogin && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  {t("auth.enterEmailToContinue")}
                </div>
              )}
            </div>
          ) : (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={registerForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.firstName')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John"
                            data-testid="input-firstName"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.lastName')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Smith"
                            data-testid="input-lastName"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Username
                  </label>
                  <Input
                    id="username"
                    placeholder="johnsmith"
                    data-testid="input-register-username"
                    {...registerForm.register("username")}
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-sm font-medium text-destructive">
                      {registerForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          data-testid="input-email"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t("auth.passwordPlaceholder")}
                          data-testid="input-register-password"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-country">
                            <SelectValue placeholder={t('auth.selectCountry')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.value} value={country.value}>
                              {country.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? t('common.creatingAccount') : t('common.createAccount')}
                </Button>
              </form>
            </Form>
          )}

          
        </CardContent>
      </Card>
    </div>
  );
}
