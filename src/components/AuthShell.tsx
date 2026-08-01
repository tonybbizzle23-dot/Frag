// Shared shell for the auth pages (login/signup): centered card on the dark
// FragClip background with brand header and footer link area.

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-abyss px-6 py-12">
      <Link to="/" className="mb-8 flex items-center gap-3">
        <img src="/logo.png" alt="FragClip" className="h-10 w-10" />
        <span className="font-heading text-3xl tracking-[0.02em] text-frag-orange">
          FRAGCLIP
        </span>
      </Link>

      <div className="w-full max-w-md rounded-md border border-charcoal bg-void p-8">
        <h1 className="font-heading text-3xl tracking-[0.02em] text-white">
          {title}
        </h1>
        <p className="mt-1 text-sm text-gray-2">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>

      <div className="mt-6 text-sm text-gray-2">{footer}</div>
    </div>
  );
}

/** Shared styling for auth form inputs. */
export const authInputClass =
  "w-full rounded-sm border bg-charcoal px-4 py-3 text-white placeholder-gray-2 transition-colors focus:outline-none focus:ring-2 focus:ring-frag-orange/50";
