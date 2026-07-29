import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
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
