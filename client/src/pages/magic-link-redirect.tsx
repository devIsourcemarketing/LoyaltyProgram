import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";

/**
 * Backward compatibility component for old email links
 * Redirects from /auth/verify-magic-link/:token to /login/magic?token=:token
 */
export default function MagicLinkRedirect() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/auth/verify-magic-link/:token");

  useEffect(() => {
    if (match && params?.token) {
      // Redirect to the new format
      navigate(`/login/magic?token=${params.token}`, { replace: true });
    } else {
      // No token found, redirect to login
      navigate("/login", { replace: true });
    }
  }, [match, params, navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
