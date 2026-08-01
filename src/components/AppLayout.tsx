import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useAuth } from "~/auth-context";
import { createCheckoutUrl } from "~/checkout";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const isPro = user?.subscription_tier === "pro";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // Leave the protected area first so the /app route guard doesn't race
      // us to /auth/login once the session clears.
      navigate({ to: "/" });
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const handleUpgrade = async () => {
    setCheckingOut(true);
    setCheckoutError("");
    try {
      const url = await createCheckoutUrl();
      window.location.href = url;
    } catch (err: any) {
      setCheckoutError(err.message || "Could not start checkout.");
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-dvh bg-abyss">
      {/* App Header */}
      <header className="sticky top-0 z-20 border-b border-charcoal/50 bg-abyss/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="FragClip" className="h-7 w-7" />
            <span className="font-heading text-xl tracking-[0.02em] text-frag-orange">
              FRAGCLIP
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/app/upload"
              className="rounded-sm bg-frag-orange px-5 py-2 font-body text-sm font-semibold text-white transition-all hover:bg-[#FF7A33] [&.active]:bg-[#FF7A33]"
            >
              New Clip
            </Link>
            {/* Free-tier users see the upgrade CTA; pro users see a badge. */}
            {user && isPro && (
              <span
                className="hidden items-center gap-1.5 rounded-sm border border-frag-orange/60 bg-frag-orange/10 px-3 py-1.5 font-body text-xs font-bold uppercase tracking-wider text-frag-orange sm:inline-flex"
                title="FragClip Pro active"
              >
                Pro
              </span>
            )}
            {user && !isPro && (
              <button
                onClick={handleUpgrade}
                disabled={checkingOut}
                className="hidden rounded-sm border border-frag-orange px-5 py-2 font-body text-sm font-semibold text-frag-orange transition-all hover:bg-frag-orange/10 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-block"
              >
                {checkingOut ? "Redirecting…" : "Upgrade to Pro"}
              </button>
            )}
            {checkoutError && (
              <span className="hidden text-xs text-kill-red sm:inline">
                {checkoutError}
              </span>
            )}
            {user && (
              <div className="flex items-center gap-3 border-l border-charcoal pl-4">
                <span
                  className="hidden max-w-[180px] truncate text-sm text-gray-1 md:inline"
                  title={user.email}
                >
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-sm border border-charcoal px-4 py-2 font-body text-sm font-medium text-gray-1 transition-all hover:border-kill-red/50 hover:text-kill-red disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingOut ? "Logging out…" : "Log out"}
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="mx-auto max-w-[1280px] px-6 py-8">
        {children}
      </main>
    </div>
  );
}
