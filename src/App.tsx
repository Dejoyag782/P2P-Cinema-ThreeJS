import "./App.css";
// import ChismizCall from "./components/chismiz-call";
import VideoCall from "./components/video-call-v2";
import { useEffect, useState } from "react";
import * as THREE from "three";

function App() {
  const [supportsWebGL, setSupportsWebGL] = useState(false);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const supportsWebGL = canvas.getContext("webgl") !== null;
    const supportsThreeJS =
      typeof THREE === "object" &&
      typeof THREE.REVISION === "string";
    setSupportsWebGL(supportsWebGL && supportsThreeJS);
  }, []);

  if (!supportsWebGL) {
    return (
      <div className="flex items-center justify-center h-screen bg-linear-to-b from-zinc-950 via-zinc-900 to-black">
        <div className="absolute inset-0 flex items-center justify-center text-white bg-black/55 backdrop-blur-xl">
          <div className="w-full max-w-5xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
                <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-linear-to-br from-amber-400/30 to-red-500/10 blur-2xl" />
                <div className="relative space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Vinema 3D
                  </div>
                  <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
                    Welcome to your 3D cinema.
                  </h1>
                  <div className="space-y-2">
                    <p className="text-base text-white/80">
                      This experience needs WebGL to render the theater in your browser.
                    </p>
                    <p className="text-sm text-white/60">
                      Please switch to a WebGL-capable browser or device to continue.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                    <span className="h-2 w-2 rounded-full bg-amber-300" />
                    WebGL not detected
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
      </div>
    );
  }

  return (
    <VideoCall />
    // <ChismizCall />
  );
}

export default App;
