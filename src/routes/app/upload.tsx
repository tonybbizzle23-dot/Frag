import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { AppLayout } from "~/components/AppLayout";

export const Route = createFileRoute("/app/upload")({
  component: UploadPage,
});

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleFile = useCallback((f: File | null) => {
    if (!f) return;
    // Accept only video files
    if (!f.type.startsWith("video/")) {
      setError("Please select a video file.");
      return;
    }
    setFile(f);
    setError("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFile(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError("");

    const fileId = crypto.randomUUID();
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const blob = file.slice(start, end);

        const formData = new FormData();
        formData.append("fileId", fileId);
        formData.append("chunkIndex", String(i));
        formData.append("totalChunks", String(totalChunks));
        formData.append("fileName", file.name);
        formData.append("chunk", blob, `chunk_${i}`);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }

        const pct = Math.round(((i + 1) / totalChunks) * 100);
        setProgress(pct);
      }

      // Upload complete — redirect to editor
      navigate({ to: "/app/editor/$id", params: { id: fileId } });
    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.");
      setUploading(false);
    }
  };

  const cancelUpload = () => {
    abortRef.current?.abort();
    setUploading(false);
    setProgress(0);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (uploading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center py-16">
          <h1 className="font-heading text-3xl tracking-[0.02em]">Uploading...</h1>
          <p className="mt-2 text-gray-2">{file?.name}</p>

          {/* Progress bar */}
          <div className="mt-8 w-full max-w-md">
            <div className="h-3 w-full overflow-hidden rounded-full bg-charcoal">
              <div
                className="h-full rounded-full bg-frag-orange transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-center font-mono text-sm text-gray-2">{progress}%</p>
          </div>

          <button
            onClick={cancelUpload}
            className="mt-6 rounded-sm border border-kill-red px-4 py-2 font-body text-sm text-kill-red transition-colors hover:bg-kill-red/10 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col items-center py-12">
        <h1 className="font-heading text-3xl tracking-[0.02em] md:text-4xl">
          Upload <span className="text-frag-orange">Gameplay</span>
        </h1>
        <p className="mt-2 text-gray-2">
          Upload your recorded gameplay to start clipping highlights.
        </p>

        {/* Drop zone */}
        <div
          className={`mt-8 w-full max-w-xl rounded-md border-2 border-dashed p-12 text-center transition-all ${
            dragActive
              ? "border-frag-orange bg-frag-orange/5"
              : file
                ? "border-victory-green bg-victory-green/5"
                : "border-gray-3 bg-void hover:border-frag-orange/40"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />

          {file ? (
            <div>
              <div className="mb-3 flex items-center justify-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-victory-green"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-subheading text-lg font-semibold text-white">
                {file.name}
              </p>
              <p className="mt-1 text-sm text-gray-2">{formatSize(file.size)}</p>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-center">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-gray-3"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="font-subheading text-lg text-gray-1">
                Drag & drop your video here
              </p>
              <p className="mt-1 text-sm text-gray-2">
                or click to browse — MP4, WebM, MOV (max 8 GB)
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-sm border border-kill-red/30 bg-kill-red/10 px-4 py-3 text-sm text-kill-red">
            {error}
          </div>
        )}

        <button
          onClick={uploadFile}
          disabled={!file}
          className={`mt-6 rounded-sm px-8 py-3 font-body text-base font-semibold transition-all ${
            file
              ? "bg-frag-orange text-white hover:bg-[#FF7A33] active:scale-[0.98] cursor-pointer"
              : "cursor-not-allowed bg-charcoal text-gray-3"
          }`}
        >
          Start Upload
        </button>

        {file && (
          <button
            onClick={() => { setFile(null); setError(""); }}
            className="mt-3 font-body text-sm text-gray-2 transition-colors hover:text-white cursor-pointer"
          >
            Choose a different file
          </button>
        )}
      </div>
    </AppLayout>
  );
}
