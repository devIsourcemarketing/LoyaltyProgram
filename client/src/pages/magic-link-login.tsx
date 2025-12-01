import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/hooks/useTranslation";

export default function MagicLinkLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const verifyMagicLink = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      
      if (!token) {
        toast({
          title: t("auth.tokenNotProvided"),
          description: t("auth.tokenNotProvided"),
          variant: "destructive",
        });
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

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

        // 2. LUEGO verificar y crear sesión con magic link
        const response = await fetch(`/api/auth/verify-magic-link/${token}`, {
          credentials: "include",
        });
        
        const data = await response.json();
        
        if (data.valid) {
          setIsValid(true);
          
          // Invalidar queries para recargar datos del usuario
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
          
          toast({
            title: t("auth.successfulAccess"),
            description: `Bienvenido de vuelta, ${data.user.firstName}`,
          });
          
          // Redirigir a la raíz usando window.location para forzar recarga completa
          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
        } else if (data.pendingApproval) {
          // Usuario pendiente de aprobación
          setIsValid(false);
          setIsPendingApproval(true);
          setErrorMessage(data.message || t("auth.accountPendingApprovalMessage"));
          toast({
            title: t("auth.accountPendingApproval"),
            description: data.message,
            variant: "destructive",
          });
          // No redirigir automáticamente para que el usuario lea el mensaje
        } else {
          setIsValid(false);
          setErrorMessage(data.message || t("auth.invalidOrExpiredLink"));
          toast({
            title: t("auth.invalidLink"),
            description: data.message || t("auth.linkInvalidOrExpired"),
            variant: "destructive",
          });
          setTimeout(() => navigate("/login"), 3000);
        }
      } catch (error) {
        console.error("Error verifying magic link:", error);
        setIsValid(false);
        setErrorMessage("Error al verificar el enlace de acceso");
        toast({
          title: "Error",
          description: "No se pudo verificar el enlace de acceso",
          variant: "destructive",
        });
        setTimeout(() => navigate("/login"), 3000);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyMagicLink();
  }, [navigate, toast, queryClient]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600 mb-4" />
            <p className="text-gray-600">Verificando tu enlace de acceso...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`h-12 w-12 rounded-full ${isPendingApproval ? 'bg-yellow-100' : 'bg-red-100'} flex items-center justify-center`}>
                <AlertCircle className={`h-6 w-6 ${isPendingApproval ? 'text-yellow-600' : 'text-red-600'}`} />
              </div>
            </div>
            <CardTitle className={`text-2xl ${isPendingApproval ? 'text-yellow-600' : 'text-red-600'}`}>
              {isPendingApproval ? t("auth.accountPendingApproval") : t("auth.invalidLinkTitle")}
            </CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant={isPendingApproval ? "default" : "destructive"}>
              <AlertDescription>
                {isPendingApproval 
                  ? t("auth.adminWillNotifyByEmail")
                  : "Serás redirigido a la página de inicio de sesión..."
                }
              </AlertDescription>
            </Alert>
            {isPendingApproval && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => navigate("/login")}
                  className="text-primary-600 hover:text-primary-700 underline"
                >
                  {t("auth.backToLogin")}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-600">{t("auth.successfulAccessTitle")}</CardTitle>
          <CardDescription>Redirigiendo al dashboard...</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
