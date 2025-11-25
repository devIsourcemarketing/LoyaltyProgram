import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Mail, MapPin, Lock, Loader2, CheckCircle } from "lucide-react";
import rewardsBanner from "@/assets/rewards-banner.png";

// Tipo de usuario desde la API
interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  country: string;
}

// Schema de validación para información personal
const profileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  country: z.string().min(2, "Country is required"),
});

// Schema de validación para cambio de contraseña
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [, setLocation] = useLocation();

  // Obtener datos del usuario actual
  const { data: user, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["/api/auth/me"],
  });

  // Redirigir al login si no está autenticado
  useEffect(() => {
    if (error || (!isLoading && !user)) {
      toast({
        title: t("admin.sessionExpired"),
        description: "Please log in again",
        variant: "destructive",
      });
      setLocation("/login");
    }
  }, [error, user, isLoading, setLocation, toast]);

  // Formulario de perfil
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      country: user?.country || "",
    },
  });

  // Formulario de contraseña
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  // Mutación para actualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMessage = "Failed to update profile";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (e) {
          // Si no es JSON, usar mensaje genérico basado en status
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      resetProfile(data.user);
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para cambiar contraseña
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to change password";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (e) {
          // Si no es JSON, usar mensaje genérico basado en status
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Password Changed",
        description: "Your password has been updated successfully.",
      });
      resetPassword();
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitProfile = (data: ProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const onSubmitPassword = (data: PasswordForm) => {
    changePasswordMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Banner de Rewards */}
      <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
        <img 
          src={rewardsBanner} 
          alt="Rewards Banner" 
          className="w-full h-auto"
        />
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and personal information
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Personal Information
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Tab de Información Personal */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-6">
                {/* Username (read-only) */}
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={user?.username || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Username cannot be changed
                  </p>
                </div>

                {/* First Name & Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        {...registerProfile("firstName")}
                        className="pl-10"
                        placeholder="John"
                      />
                    </div>
                    {profileErrors.firstName && (
                      <p className="text-sm text-red-500 mt-1">
                        {profileErrors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="lastName">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        {...registerProfile("lastName")}
                        className="pl-10"
                        placeholder="Doe"
                      />
                    </div>
                    {profileErrors.lastName && (
                      <p className="text-sm text-red-500 mt-1">
                        {profileErrors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      {...registerProfile("email")}
                      className="pl-10"
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  {profileErrors.email && (
                    <p className="text-sm text-red-500 mt-1">
                      {profileErrors.email.message}
                    </p>
                  )}
                </div>

                {/* Country */}
                <div>
                  <Label htmlFor="country">
                    Country <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="country"
                      {...registerProfile("country")}
                      className="pl-10"
                      placeholder="United States"
                    />
                  </div>
                  {profileErrors.country && (
                    <p className="text-sm text-red-500 mt-1">
                      {profileErrors.country.message}
                    </p>
                  )}
                </div>

                {/* Role (read-only) */}
                <div>
                  <Label htmlFor="role">{t('common.role')}</Label>
                  <Input
                    id="role"
                    value={user?.role === "admin" ? t('admin.roleAdmin') : t('admin.roleUser')}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Seguridad (Cambio de Contraseña) */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  Choose a strong password with at least 6 characters. Include uppercase,
                  lowercase, numbers, and special characters for better security.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-6">
                {/* Current Password */}
                <div>
                  <Label htmlFor="currentPassword">
                    Current Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...registerPassword("currentPassword")}
                    placeholder="Enter your current password"
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-red-500 mt-1">
                      {passwordErrors.currentPassword.message}
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <Label htmlFor="newPassword">
                    New Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...registerPassword("newPassword")}
                    placeholder="Enter new password (min. 6 characters)"
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-red-500 mt-1">
                      {passwordErrors.newPassword.message}
                    </p>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <Label htmlFor="confirmPassword">
                    Confirm New Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...registerPassword("confirmPassword")}
                    placeholder="Re-enter new password"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
