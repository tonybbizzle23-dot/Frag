import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { AppLayout } from "~/components/AppLayout";

export const Route = createFileRoute("/app/")({
  component: AppHome,
});

function AppHome() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center py-16 text-center">
        <img src="/logo.png" alt="FragClip" className="mb-6 h-16 w-16" />
        <h1 className="font-heading text-4xl tracking-[0.02em] md:text-5xl">
          Welcome to <span className="text-frag-orange">FragClip</span>
        </h1>
        <p className="mt-3 max-w-lg text-gray-2">
          Upload your gameplay, drop markers on the timeline, and generate perfect
          clips for TikTok, Shorts, and Reels.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Link
            to="/app/upload"
            className="group rounded-md border border-charcoal bg-void p-8 text-left transition-all hover:border-frag-orange/30"
          >
            <div className="mb-3 text-frag-orange">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3 className="font-subheading text-xl font-semibold text-white">
              Upload
            </h3>
            <p className="mt-2 text-sm text-gray-2">
              Upload your gameplay footage to get started.
            </p>
          </Link>

          <Link
            to="/app/clips"
            className="group rounded-md border border-charcoal bg-void p-8 text-left transition-all hover:border-frag-orange/30"
          >
            <div className="mb-3 text-frag-orange">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="m8 4 2 4h4l2-4M8 20l2-4h4l2 4M9 12h.01M15 12h.01" />
              </svg>
            </div>
            <h3 className="font-subheading text-xl font-semibold text-white">My Clips</h3>
            <p className="mt-2 text-sm text-gray-2">Browse, download, and manage your saved highlights.</p>
          </Link>

          <div className="rounded-md border border-charcoal bg-void p-8 text-left opacity-50">
            <div className="mb-3 text-frag-orange">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
              </svg>
            </div>
            <h3 className="font-subheading text-xl font-semibold text-white">
              Share
            </h3>
            <p className="mt-2 text-sm text-gray-2">
              Generate and download clips after marking moments.
            </p>
          </div>
        </div>

        <Link
          to="/app/upload"
          className="mt-10 inline-flex rounded-sm bg-frag-orange px-8 py-3.5 font-body text-base font-semibold text-white transition-all hover:bg-[#FF7A33] active:scale-[0.98]"
        >
          Upload Your First Video
        </Link>
      </div>
    </AppLayout>
  );
}
