import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect } from "react";

export const Route = createFileRoute("/app/editor/$id")({
  component: EditorPage,
});

function EditorPage() {
  const { id } = Route.useParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [markers, setMarkers] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatedClips, setGeneratedClips] = useState<any>(null);

  const videoUrl = `/api/video/${id}`;

  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current;
    if (vid) {
      setDuration(vid.duration);
      setVideoLoaded(true);
      setVideoError("");
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (vid) {
      setCurrentTime(vid.currentTime);
    }
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoError("Failed to load video. The file may be corrupted or unsupported.");
  }, []);

  // Mark current time
  const addMarker = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const t = vid.currentTime;
    // Avoid duplicate markers at nearly the same time (within 0.5s)
    if (markers.some((m) => Math.abs(m - t) < 0.5)) return;

    setMarkers((prev) => [...prev, t].sort((a, b) => a - b));
  }, [markers]);

  const removeMarker = useCallback((index: number) => {
    setMarkers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Seek when clicking on timeline
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const timeline = timelineRef.current;
      const vid = videoRef.current;
      if (!timeline || !vid || !duration) return;

      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = x / rect.width;
      const seekTime = pct * duration;
      vid.currentTime = seekTime;
    },
    [duration]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space = toggle play/pause
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        const vid = videoRef.current;
        if (vid) {
          vid.paused ? vid.play() : vid.pause();
        }
      }
      // M = mark
      if (e.code === "KeyM" && e.target === document.body) {
        e.preventDefault();
        addMarker();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addMarker]);

  const generateClips = async () => {
    if (markers.length === 0) return;

    setGenerating(true);
    setGenerateError("");

    try {
      const res = await fetch("/api/generate-clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: id, markers }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setGeneratedClips(data);
    } catch (err: any) {
      setGenerateError(err.message || "Clip generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };


  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl tracking-[0.02em]">
          Mark Your <span className="text-frag-orange">Highlights</span>
        </h1>
        <Link
          to="/app/upload"
          className="rounded-sm border border-gray-3 px-4 py-2 font-body text-sm text-gray-1 transition-colors hover:border-frag-orange hover:text-white"
        >
          Upload Another
        </Link>
      </div>

      <p className="mt-1 text-sm text-gray-2">
        Play the video and press the <kbd className="rounded-sm border border-charcoal bg-void px-1.5 py-0.5 font-mono text-xs">M</kbd> key or click{" "}
        <span className="text-frag-orange">Mark</span> to drop markers at highlight moments.
      </p>

      {videoError && (
        <div className="mt-4 rounded-sm border border-kill-red/30 bg-kill-red/10 px-4 py-3 text-sm text-kill-red">
          {videoError}
        </div>
      )}

      {/* Video Player */}
      <div className="mt-6 overflow-hidden rounded-md border border-charcoal bg-black">
        {videoLoaded ? null : (
          <div className="flex aspect-video items-center justify-center bg-void text-gray-2">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-frag-orange border-t-transparent" />
              <span>Loading video...</span>
            </div>
          </div>
        )}
        <video
          ref={videoRef}
          src={videoUrl}
          className={`w-full ${videoLoaded ? "" : "hidden"}`}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onError={handleVideoError}
          controls
          preload="metadata"
        />
      </div>

      {/* Timeline scrubber with markers */}
      {videoLoaded && (
        <div className="mt-4">
          {/* Current time display */}
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-sm text-gray-2">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <span className="text-sm text-gray-2">
              {markers.length} marker{markers.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Timeline */}
          <div
            ref={timelineRef}
            className="relative h-10 cursor-pointer rounded-sm bg-void"
            onClick={handleTimelineClick}
          >
            {/* Played portion */}
            <div
              className="absolute inset-y-0 left-0 rounded-sm bg-frag-orange/20"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />

            {/* Current position indicator */}
            <div
              className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />

            {/* Markers */}
            {markers.map((t, i) => (
              <div
                key={i}
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-frag-orange shadow-[0_0_6px_rgba(255,92,0,0.6)] transition-transform hover:scale-125"
                style={{ left: `${(t / duration) * 100}%` }}
                title={`Marker at ${formatTime(t)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const vid = videoRef.current;
                  if (vid) vid.currentTime = t;
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={addMarker}
          disabled={!videoLoaded}
          className={`rounded-sm px-6 py-2.5 font-body text-sm font-semibold transition-all ${
            videoLoaded
              ? "bg-frag-orange text-white hover:bg-[#FF7A33] active:scale-[0.98] cursor-pointer"
              : "cursor-not-allowed bg-charcoal text-gray-3"
          }`}
        >
          Mark ({formatTime(currentTime)})
        </button>
        <span className="text-xs text-gray-3">or press M</span>
      </div>

      {/* Markers list */}
      {markers.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-subheading text-xl font-semibold text-white">
              Markers
            </h2>
            <button
              onClick={() => setMarkers([])}
              className="font-body text-sm text-kill-red transition-colors hover:text-[#FF4060] cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {markers.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-sm border border-charcoal bg-void px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-frag-orange/20 font-mono text-xs text-frag-orange">
                    {i + 1}
                  </div>
                  <span className="font-mono text-sm text-gray-1">
                    {formatTime(t)}
                  </span>
                  <span className="text-xs text-gray-3">
                    (clip: {formatTime(Math.max(0, t - 10))} – {formatTime(t + 5)})
                  </span>
                </div>
                <button
                  onClick={() => removeMarker(i)}
                  className="rounded-sm p-1 text-gray-2 transition-colors hover:text-kill-red cursor-pointer"
                  title="Remove marker"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Generate button */}
          <div className="mt-6">
            {generateError && (
              <div className="mb-4 rounded-sm border border-kill-red/30 bg-kill-red/10 px-4 py-3 text-sm text-kill-red">
                {generateError}
              </div>
            )}

            {generatedClips ? (
              <div className="rounded-md border border-victory-green/30 bg-victory-green/5 p-6 text-center">
                <p className="font-subheading text-xl font-semibold text-victory-green">
                  {generatedClips.clips.length} clip{generatedClips.clips.length !== 1 ? "s" : ""} generated!
                </p>
                <Link
                  to="/app/clips/$id"
                  params={{ id }}
                  className="mt-4 inline-flex rounded-sm bg-frag-orange px-6 py-3 font-body text-sm font-semibold text-white transition-all hover:bg-[#FF7A33]"
                >
                  View & Download Clips
                </Link>
              </div>
            ) : (
              <button
                onClick={generateClips}
                disabled={generating || markers.length === 0}
                className={`rounded-sm px-8 py-3 font-body text-base font-semibold transition-all ${
                  generating
                    ? "cursor-wait bg-charcoal text-gray-2"
                    : markers.length > 0
                      ? "bg-frag-orange text-white hover:bg-[#FF7A33] active:scale-[0.98] cursor-pointer"
                      : "cursor-not-allowed bg-charcoal text-gray-3"
                }`}
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Generating Clips...
                  </span>
                ) : (
                  `Generate ${markers.length} Clip${markers.length !== 1 ? "s" : ""}`
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
