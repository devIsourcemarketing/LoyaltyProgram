import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { login, register } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail } from "lucide-react";
import { useLocation } from "wouter";
import backgroundImage from "@assets/login.jpg";
import kasperskyLogo from "@/assets/logo-kaspersky-cup.png";
import { t } from '@/lib/i18n';

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  country: z.string().min(1, "Country is required"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function Login() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [showMagicLinkDialog, setShowMagicLinkDialog] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

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
        description: "Logged in successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Login failed",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: (userData: RegisterForm) => register(userData),
    onSuccess: (data: any) => {
      toast({
        title: t("common.success"),
        description: data.message || "Account created successfully. Please wait for administrator approval before you can log in.",
      });
      setIsLogin(true);
      registerForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Registration failed",
        variant: "destructive",
      });
    },
  });

  const magicLinkMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch("/api/auth/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      // Si el usuario no existe, retornar con flag especial
      if (response.status === 404 && data.userExists === false) {
        return { userExists: false, email, message: data.message };
      }
      
      // Si hay otro error, lanzar excepción
      if (!response.ok) {
        throw new Error(data.message || "Failed to send magic link");
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Si el usuario no existe, redirigir a registro sin contraseña
      if (data.userExists === false) {
        setShowMagicLinkDialog(false);
        setMagicLinkEmail("");
        // Redirigir a página de registro passwordless con el email
        setLocation(`/passwordless-register?email=${encodeURIComponent(data.email)}`);
        toast({
          title: "Registro requerido",
          description: "No existe una cuenta con este email. Por favor, completa tu registro.",
          variant: "default",
        });
        return;
      }
      
      // Usuario existe y se envió el link
      toast({
        title: t("auth.linkSentTitle"),
        description: t("auth.linkSentDescription"),
      });
      setShowMagicLinkDialog(false);
      setMagicLinkEmail("");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to send magic link",
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
            {isLogin ? "Log in to your account" : "Crea tu cuenta"}
          </p>
        </CardHeader>
        <CardContent>
          {isLogin ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your username"
                          data-testid="input-username"
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
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
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
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowMagicLinkDialog(true)}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Login without a password
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={registerForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
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
                        <FormLabel>Last Name</FormLabel>
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
                          placeholder="Create a password"
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
                            <SelectValue placeholder="Select your country" />
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
                  {registerMutation.isPending ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary-600 hover:text-primary-700 text-sm"
              data-testid="button-toggle-auth"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Magic Link Dialog */}
      <Dialog open={showMagicLinkDialog} onOpenChange={setShowMagicLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("auth.passwordlessAccess")}</DialogTitle>
            <DialogDescription>
              {t("auth.magicLinkDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="magic-link-email">{t("common.email")}</Label>
              <Input
                id="magic-link-email"
                type="email"
                placeholder={t("auth.yourEmail")}
                value={magicLinkEmail}
                onChange={(e) => setMagicLinkEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && magicLinkEmail) {
                    magicLinkMutation.mutate(magicLinkEmail);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowMagicLinkDialog(false);
                setMagicLinkEmail("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => magicLinkMutation.mutate(magicLinkEmail)}
              disabled={!magicLinkEmail || magicLinkMutation.isPending}
            >
              {magicLinkMutation.isPending ? t("support.submitting") : t("auth.sendMagicLink")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
