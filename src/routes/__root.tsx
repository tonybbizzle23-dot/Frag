import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FragClip — Clip What Matters" },
      {
        name: "description",
        content:
          "FragClip automatically clips your best FPS moments — kills, headshots, multikills — and exports them for TikTok, Shorts, and Reels.",
      },
      { property: "og:title", content: "FragClip — Clip What Matters" },
      {
        property: "og:description",
        content:
          "Auto-detect and export your best FPS gameplay moments. No scrubbing required.",
      },
      { property: "og:type", content: "website" },
      { name: "theme-color", content: "#0A0A0F" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Rajdhani:wght@500;600&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/logo.png" },
    ],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh bg-abyss font-body text-white antialiased">
        {children}
        <Scripts />
        <SpeedInsights />
      </body>
    </html>
  );
}
