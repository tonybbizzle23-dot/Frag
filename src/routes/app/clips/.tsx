import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "~/components/AppLayout";

export const Route = createFileRoute("/app/clips/$id")({
  component: ClipsPage,
});

function ClipsPage() {
  const { id } = Route.useParams();
  const [clips, setClips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [videoExists, setVideoExists] = useState<boolean | null>(null);

  // Check if video exists
  useEffect(() => {
    fetch(`/api/video/${id}/exists`)
      .then((r) => r.json())
      .then((d) => {
        setVideoExists(d.exists);
        if (!d.exists) {
          setLoading(false);
          setError("This video doesn't exist or may have been removed.");
        }
      })
      .catch(() => setVideoExists(false));
  }, [id]);

  // Load clips metadata
  useEffect(() => {
    if (videoExists === false) return;

    const fetchClips = async () => {
      try {
        const res = await fetch("/api/list-clips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: id }),
        });

        if (res.ok) {
          const data = await res.json();
          setClips(data.clips || []);
        } else {
          setError("No clips found. Go back and generate clips first.");
        }
      } catch {
        setError("Failed to load clips. Please go back and try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchClips();
  }, [id, videoExists]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const downloadClip = (url: string, filename: string) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAll = () => {
    // Count actual valid files
    const validClips = clips.filter((c) => c.landscapeUrl || c.verticalUrl);
    if (validClips.length === 0) return;

    validClips.forEach((clip, idx) => {
      setTimeout(() => {
        if (clip.landscapeUrl) {
          downloadClip(
            clip.landscapeUrl,
            `fragclip_clip${clip.markerIndex}_landscape.mp4`
          );
        }
        if (clip.verticalUrl) {
          setTimeout(() => {
            downloadClip(
              clip.verticalUrl,
              `fragclip_clip${clip.markerIndex}_vertical.mp4`
            );
          }, 300);
        }
      }, idx * 600);
    });
  };

  // Calculate total downloadable files (skip empty variants)
  const totalDownloadable = clips.reduce((sum, c) => {
    return sum + (c.landscapeUrl ? 1 : 0) + (c.verticalUrl ? 1 : 0);
  }, 0);

  const hasMissingVariants = clips.some((c) => !c.landscapeUrl || !c.verticalUrl);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-frag-orange border-t-transparent" />
          <p className="mt-4 text-gray-2">Loading clips...</p>
        </div>
      </AppLayout>
    );
  }

  if (videoExists === false) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center py-16">
          <div className="rounded-md border border-kill-red/30 bg-kill-red/10 px-6 py-8 text-center max-w-md">
            <p className="font-subheading text-xl font-semibold text-kill-red">
              Video Not Found
            </p>
            <p className="mt-2 text-gray-2">
              This video doesn't exist or may have been removed. Upload a new video to create clips.
            </p>
            <Link
              to="/app/upload"
              className="mt-6 inline-flex rounded-sm bg-frag-orange px-6 py-3 font-body text-sm font-semibold text-white transition-all hover:bg-[#FF7A33]"
            >
              Upload a Video
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && clips.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center py-16">
          <div className="rounded-md border border-kill-red/30 bg-kill-red/10 px-6 py-8 text-center">
            <p className="text-lg text-kill-red">{error}</p>
            <Link
              to="/app/editor/$id"
              params={{ id }}
              className="mt-4 inline-flex rounded-sm bg-frag-orange px-6 py-2.5 font-body text-sm font-semibold text-white transition-all hover:bg-[#FF7A33]"
            >
              Back to Editor
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-3xl tracking-[0.02em]">
            Your <span className="text-frag-orange">Clips</span>
          </h1>
          <div className="flex items-center gap-3">
            <Link
              to="/app/editor/$id"
              params={{ id }}
              className="rounded-sm border border-gray-3 px-4 py-2 font-body text-sm text-gray-1 transition-colors hover:border-frag-orange hover:text-white"
            >
              Back to Editor
            </Link>
          </div>
        </div>

        <p className="mt-1 text-sm text-gray-2">
          {clips.length} clip{clips.length !== 1 ? "s" : ""} generated. Download in landscape or vertical format.
        </p>

        {hasMissingVariants && (
          <div className="mt-3 rounded-sm border border-headshot-yellow/30 bg-headshot-yellow/10 px-4 py-2 text-sm text-headshot-yellow">
            Some clip variants failed to generate. Only the successful variants are available for download.
          </div>
        )}

        {clips.length > 0 && (
          <button
            onClick={downloadAll}
            disabled={totalDownloadable === 0}
            className={`mt-4 rounded-sm px-6 py-2.5 font-body text-sm font-semibold text-white transition-all active:scale-[0.98] cursor-pointer ${
              totalDownloadable > 0
                ? "bg-frag-orange hover:bg-[#FF7A33]"
                : "cursor-not-allowed bg-charcoal text-gray-3"
            }`}
          >
            Download All ({totalDownloadable} file{totalDownloadable !== 1 ? "s" : ""})
          </button>
        )}

        {/* Clip cards */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {clips.map((clip, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-md border border-charcoal bg-void"
            >
              {/* Video preview - landscape (fallback to vertical if landscape missing) */}
              <div className="bg-black">
                <video
                  src={clip.landscapeUrl || clip.verticalUrl || ""}
                  className="w-full"
                  controls
                  preload="metadata"
                  controlsList="nodownload"
                />
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-subheading text-lg font-semibold text-white">
                      Clip {i + 1}
                    </span>
                    <span className="ml-2 font-mono text-xs text-gray-2">
                      at {formatTime(clip.markerTime)}
                    </span>
                  </div>
                  {clip.errors && clip.errors.length > 0 && (
                    <span className="rounded-pill bg-kill-red/20 px-2 py-0.5 font-mono text-xs text-kill-red" title={clip.errors.join(", ")}>
                      partial
                    </span>
                  )}
                </div>

                {/* Format badges and download buttons */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {/* Landscape */}
                  {clip.landscapeUrl ? (
                    <>
                      <span className="rounded-pill border border-charcoal bg-abyss px-3 py-1 font-mono text-xs text-gray-1">
                        Landscape
                      </span>
                      <button
                        onClick={() =>
                          downloadClip(
                            clip.landscapeUrl,
                            `fragclip_clip${clip.markerIndex}_landscape.mp4`
                          )
                        }
                        className="rounded-sm bg-frag-orange/20 px-3 py-1 font-body text-xs font-semibold text-frag-orange transition-colors hover:bg-frag-orange/30 cursor-pointer"
                      >
                        Download
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="rounded-pill border border-charcoal bg-abyss px-3 py-1 font-mono text-xs text-gray-3 line-through">
                        Landscape
                      </span>
                      <span className="font-body text-xs text-kill-red">Failed</span>
                    </>
                  )}

                  {/* Vertical */}
                  {clip.verticalUrl ? (
                    <>
                      <span className="ml-2 rounded-pill border border-charcoal bg-abyss px-3 py-1 font-mono text-xs text-electric-blue">
                        9:16
                      </span>
                      <button
                        onClick={() =>
                          downloadClip(
                            clip.verticalUrl,
                            `fragclip_clip${clip.markerIndex}_vertical.mp4`
                          )
                        }
                        className="rounded-sm bg-electric-blue/20 px-3 py-1 font-body text-xs font-semibold text-electric-blue transition-colors hover:bg-electric-blue/30 cursor-pointer"
                      >
                        Download
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="ml-2 rounded-pill border border-charcoal bg-abyss px-3 py-1 font-mono text-xs text-gray-3 line-through">
                        9:16
                      </span>
                      <span className="font-body text-xs text-kill-red">Failed</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {clips.length === 0 && !loading && !error && (
          <div className="mt-8 rounded-md border border-charcoal bg-void p-12 text-center">
            <p className="text-gray-2">
              No clips found. Go to the editor, mark some highlights, and generate clips.
            </p>
            <Link
              to="/app/editor/$id"
              params={{ id }}
              className="mt-4 inline-flex rounded-sm bg-frag-orange px-6 py-2.5 font-body text-sm font-semibold text-white transition-all hover:bg-[#FF7A33]"
            >
              Go to Editor
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
