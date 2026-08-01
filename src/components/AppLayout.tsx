import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useAuth } from "~/auth-context";

const PRO_CHECKOUT_URL = "https://buy.stripe.com/bJefZj0P9fUd8x96G5fEk00";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

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
            {/* Only free-tier users see the upsell. */}
            {user && !isPro && (
              <a
                href={PRO_CHECKOUT_URL}
                className="hidden rounded-sm border border-frag-orange px-5 py-2 font-body text-sm font-semibold text-frag-orange transition-all hover:bg-frag-orange/10 sm:inline-block"
              >
                Upgrade to Pro
              </a>
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
