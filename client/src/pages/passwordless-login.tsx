import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function PasswordlessLogin() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/passwordless-login/:token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token") || params?.token;

    if (!token) {
      setStatus("error");
      setMessage("No invitation token provided");
      setTimeout(() => navigate("/login"), 3000);
      return;
    }

    // Intentar login passwordless
    attemptPasswordlessLogin(token);
  }, [params, navigate]);

  const attemptPasswordlessLogin = async (token: string) => {
    try {
      console.log("🔐 Attempting passwordless login with token:", token);

      const response = await fetch(`/api/auth/passwordless-login/${token}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();
      console.log("📬 Response:", data);

      if (data.success) {
        setStatus("success");
        setMessage(data.message || "Welcome! Redirecting to dashboard...");
        
        // Redirigir al dashboard después de 2 segundos
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        setStatus("error");
        setMessage(data.message || "Failed to activate your account");
        setTimeout(() => navigate("/login"), 4000);
      }
    } catch (error) {
      console.error("❌ Passwordless login error:", error);
      setStatus("error");
      setMessage("Unable to connect to the server. Please try again later.");
      setTimeout(() => navigate("/login"), 4000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            {status === "loading" && (
              <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
            )}
            {status === "success" && (
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            )}
            {status === "error" && (
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            )}
          </div>

          <CardTitle className="text-center text-2xl">
            {status === "loading" && t('common.activatingAccount')}
            {status === "success" && t('common.welcomeToProgram')}
            {status === "error" && t('common.activationFailed')}
          </CardTitle>

          <CardDescription className="text-center">
            {status === "loading" && t('common.pleaseWaitSetup')}
            {status === "success" && t('common.accountReadyRedirecting')}
            {status === "error" && t('common.problemWithInvitation')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Alert className={
            status === "success" ? "border-green-200 bg-green-50" :
            status === "error" ? "border-red-200 bg-red-50" :
            "border-blue-200 bg-blue-50"
          }>
            <AlertDescription className="text-center">
              {message || "Processing your invitation..."}
            </AlertDescription>
          </Alert>

          {status === "loading" && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-primary-600 animate-pulse"></div>
                <p className="text-sm text-muted-foreground">{t('auth.verifyingInvitationStatus')}</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-primary-600 animate-pulse delay-100"></div>
                <p className="text-sm text-muted-foreground">{t('auth.creatingYourAccount')}</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-primary-600 animate-pulse delay-200"></div>
                <p className="text-sm text-muted-foreground">{t('auth.settingUpAccess')}</p>
              </div>
            </div>
          )}

          {status === "success" && (
            <div className="mt-6 text-center">
              <p className="text-sm text-green-600 font-medium">
                ✨ No password needed! You're all set.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                You can update your profile anytime from the dashboard
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                This link may have expired or already been used.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Please contact your administrator for a new invitation.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
