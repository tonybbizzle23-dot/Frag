import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/app/clips/$id")({
  component: ClipsPage,
});

function ClipsPage() {
  const { id } = Route.useParams();
  const [clips, setClips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load clips metadata
  useEffect(() => {
    const fetchClips = async () => {
      try {
        // Re-generate by calling the API with the same markers
        // For now, we try to fetch existing clips or use session storage
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
  }, [id]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const downloadClip = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAll = () => {
    clips.forEach((clip) => {
      setTimeout(() => {
        downloadClip(clip.landscapeUrl, `fragclip_clip${clip.markerIndex}_landscape.mp4`);
        setTimeout(() => {
          downloadClip(clip.verticalUrl, `fragclip_clip${clip.markerIndex}_vertical.mp4`);
        }, 300);
      }, clip.markerIndex * 600);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-frag-orange border-t-transparent" />
        <p className="mt-4 text-gray-2">Loading clips...</p>
      </div>
    );
  }

  if (error && clips.length === 0) {
    return (
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
    );
  }

  return (
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

      {clips.length > 0 && (
        <button
          onClick={downloadAll}
          className="mt-4 rounded-sm bg-frag-orange px-6 py-2.5 font-body text-sm font-semibold text-white transition-all hover:bg-[#FF7A33] active:scale-[0.98] cursor-pointer"
        >
          Download All ({clips.length * 2} files)
        </button>
      )}

      {/* Clip cards */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {clips.map((clip, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-md border border-charcoal bg-void"
          >
            {/* Video preview - landscape */}
            <div className="bg-black">
              <video
                src={clip.landscapeUrl}
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
              </div>

              {/* Format badges and download buttons */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-pill border border-charcoal bg-abyss px-3 py-1 font-mono text-xs text-gray-1">
                  Landscape
                </span>
                <button
                  onClick={() =>
                    downloadClip(
                      clip.landscapeUrl,
                      `fragclip_clip${i}_landscape.mp4`
                    )
                  }
                  className="rounded-sm bg-frag-orange/20 px-3 py-1 font-body text-xs font-semibold text-frag-orange transition-colors hover:bg-frag-orange/30 cursor-pointer"
                >
                  Download
                </button>

                <span className="ml-2 rounded-pill border border-charcoal bg-abyss px-3 py-1 font-mono text-xs text-electric-blue">
                  9:16
                </span>
                <button
                  onClick={() =>
                    downloadClip(
                      clip.verticalUrl,
                      `fragclip_clip${i}_vertical.mp4`
                    )
                  }
                  className="rounded-sm bg-electric-blue/20 px-3 py-1 font-body text-xs font-semibold text-electric-blue transition-colors hover:bg-electric-blue/30 cursor-pointer"
                >
                  Download
                </button>
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
  );
}
