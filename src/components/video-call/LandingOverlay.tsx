type LandingOverlayProps = {
  visible: boolean;
  onOpenNamePrompt: (mode: "host" | "join") => void;
};

export default function LandingOverlay({ visible, onOpenNamePrompt }: LandingOverlayProps) {
  return (
    <div
      className={`absolute inset-0 z-[70] flex items-center justify-center bg-linear-to-b from-zinc-950/90 via-zinc-900/85 to-black/90 text-white transition-opacity duration-500 ease-out ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-xl" />
      <div className="relative w-full max-w-5xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
            <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-linear-to-br from-emerald-400/25 to-cyan-500/10 blur-2xl" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-linear-to-br from-rose-500/20 to-amber-400/10 blur-2xl" />

            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Vinema 3D
              </div>

              <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
                Choose your role.
              </h1>

              <p className="text-base text-white/80">
                Start a session as a host, or join instantly as a viewer.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => onOpenNamePrompt("host")}
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/15 active:scale-[0.99]"
                >
                  I'm the Host
                </button>

                <button
                  onClick={() => onOpenNamePrompt("join")}
                  className="inline-flex items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/15 active:scale-[0.99]"
                >
                  I'm a Viewer
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                Peer-to-peer sessions - no centralized streaming
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 text-white/90">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 12h8M12 8v8" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold">PeerJS powered</h2>
              </div>
              <p className="text-sm leading-relaxed text-white/70">
                Vinema 3D connects hosts and viewers directly using <strong>PeerJS</strong>,
                delivering real-time peer-to-peer streaming without centralized servers.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-400/15 text-rose-200">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold">Three.js immersion</h2>
              </div>
              <p className="text-sm leading-relaxed text-white/70">
                Each session lives inside a 3D theater powered by <strong>Three.js</strong>,
                creating a shared cinematic space.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
