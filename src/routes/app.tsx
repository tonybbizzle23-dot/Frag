// Route guard for the entire /app/* section. Renders nothing (redirects to
// /auth/login) until a session is confirmed. Registered as a layout route at
// /app so every child route (dashboard, upload, editor, clips) is protected.

import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { authSnapshot, useAuth } from "~/auth-context";

export const Route = createFileRoute("/app")({
  beforeLoad: () => {
    // Fast path: if /api/auth/me already resolved and there's no session,
    // redirect during navigation instead of flashing the page.
    if (!authSnapshot.user && !authSnapshot.isLoading) {
      throw redirect({ to: "/auth/login" });
    }
  },
  component: AppRouteGuard,
});

function AppRouteGuard() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Slow path: /me resolves (or fails) while we're already on a protected page.
  useEffect(() => {
    if (!isLoading && !user && location.pathname.startsWith("/app")) {
      navigate({ to: "/auth/login" });
    }
  }, [isLoading, user, navigate, location.pathname]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-abyss">
        <img src="/logo.png" alt="FragClip" className="h-12 w-12 animate-pulse" />
        <p className="font-mono text-sm text-gray-2">LOADING…</p>
      </div>
    );
  }

  return <Outlet />;
}
