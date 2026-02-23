type LoadingOverlayProps = {
  visible: boolean;
  progressBarWidth: number;
  progressPercent: number;
};

export default function LoadingOverlay({
  visible,
  progressBarWidth,
  progressPercent,
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center text-white bg-black/55 backdrop-blur-xl">
      <div className="w-full max-w-xl px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <div className="absolute -top-28 -left-24 h-56 w-56 rounded-full bg-linear-to-br from-cyan-400/25 to-blue-500/10 blur-2xl" />
          <div className="relative space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
              <span className="h-2 w-2 rounded-full bg-cyan-300" />
              Vinema 3D
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">Loading assets</h1>
            <p className="text-sm text-white/70">Preparing the 3D cinema environment.</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-linear-to-r from-cyan-400 via-blue-400 to-indigo-400 transition-all"
                style={{ width: `${progressBarWidth}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-white/50">
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2 w-2 animate-ping rounded-full bg-cyan-300/80" />
                Optimizing shaders and streams
              </span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
