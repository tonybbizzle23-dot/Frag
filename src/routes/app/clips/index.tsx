import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "~/components/AppLayout";

export const Route = createFileRoute("/app/clips/")({
  component: ClipLibraryPage,
});

type Clip = {
  id: string;
  markerTime: number | string;
  marker_time?: number | string;
  createdAt?: string;
  created_at?: string;
  game?: string | null;
  thumbnailUrl?: string | null;
  landscapeUrl?: string | null;
  verticalUrl?: string | null;
  markerIndex?: number;
};

const formatTime = (value: number | string | undefined) => {
  const seconds = Number(value ?? 0);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
};

const formatDate = (value: string | undefined) => {
  if (!value) return "Recently";
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

function DownloadLink({ url, label, filename }: { url: string | null | undefined; label: string; filename: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download={filename}
      className="rounded-sm border border-frag-orange px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-frag-orange transition-colors hover:bg-frag-orange/10"
    >
      {label}
    </a>
  );
}

function ClipLibraryPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/clips", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load your clips.");
        return response.json();
      })
      .then((data) => active && setClips(data.clips ?? []))
      .catch((err) => active && setError(err.message || "Unable to load your clips. Please try again."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const deleteClip = async (id: string) => {
    if (!window.confirm("Delete this clip? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/clips/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Could not delete clip.");
      setClips((current) => current.filter((clip) => clip.id !== id));
      setToast("Clip deleted");
      window.setTimeout(() => setToast(""), 3000);
    } catch (err: any) {
      setToast(err.message || "Could not delete clip. Please try again.");
      window.setTimeout(() => setToast(""), 4000);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-4xl tracking-[0.02em]">My <span className="text-frag-orange">Clips</span></h1>
          <p className="mt-1 text-sm text-gray-2">Your saved highlights, ready to share.</p>
        </div>
        <Link to="/app/upload" className="mt-3 inline-flex w-fit rounded-sm bg-frag-orange px-5 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-[#FF7A33] sm:mt-0">New Clip</Link>
      </div>

      {toast && <div role="status" className="fixed bottom-6 right-6 z-30 rounded-sm border border-charcoal bg-void px-4 py-3 text-sm text-gray-1 shadow-lg">{toast}</div>}
      {loading && <div className="grid gap-5 pt-8 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading clips"><div className="h-64 animate-pulse rounded-md border border-charcoal bg-void" /><div className="hidden h-64 animate-pulse rounded-md border border-charcoal bg-void sm:block" /><div className="hidden h-64 animate-pulse rounded-md border border-charcoal bg-void lg:block" /></div>}
      {!loading && error && <div role="alert" className="mt-8 rounded-md border border-kill-red/30 bg-kill-red/10 px-6 py-5 text-kill-red">{error}</div>}
      {!loading && !error && clips.length === 0 && (
        <div className="flex flex-col items-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-charcoal bg-void"><img src="/logo.png" alt="" className="h-9 w-9 opacity-70" /></div>
          <h2 className="mt-5 font-subheading text-xl font-semibold text-white">No clips yet</h2>
          <p className="mt-2 text-gray-2">No clips yet. Upload a video to get started.</p>
          <Link to="/app/upload" className="mt-6 rounded-sm bg-frag-orange px-6 py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-[#FF7A33]">Upload a Video</Link>
        </div>
      )}
      {!loading && !error && clips.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clips.map((clip) => {
            const time = clip.markerTime ?? clip.marker_time;
            return <article key={clip.id} className="overflow-hidden rounded-md border border-charcoal bg-void transition-colors hover:border-frag-orange/30">
              <div className="relative aspect-video bg-abyss">
                {clip.thumbnailUrl ? <img src={clip.thumbnailUrl} alt={`${clip.game || "Gameplay"} clip thumbnail`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><img src="/logo.png" alt="FragClip" className="h-12 w-12 opacity-30" /></div>}
                <span className="absolute bottom-2 left-2 rounded-sm bg-abyss/90 px-2 py-1 font-mono text-xs text-white">{formatTime(time)}</span>
                {clip.game && <span className="absolute right-2 top-2 rounded-sm border border-white/10 bg-abyss/90 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-gray-1">{clip.game}</span>}
              </div>
              <div className="p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs text-gray-2">{formatDate(clip.createdAt ?? clip.created_at)}</span><button type="button" onClick={() => deleteClip(clip.id)} aria-label="Delete clip" className="text-gray-3 transition-colors hover:text-red-400"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5" /></svg></button></div><div className="mt-4 flex flex-wrap gap-2"><DownloadLink url={clip.landscapeUrl} label="Landscape" filename={`fragclip-${clip.id}-landscape.mp4`} /><DownloadLink url={clip.verticalUrl} label="Vertical" filename={`fragclip-${clip.id}-vertical.mp4`} /></div></div>
            </article>;
          })}
        </div>
      )}
    </AppLayout>
  );
}
