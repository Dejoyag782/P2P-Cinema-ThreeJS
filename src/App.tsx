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
      <div className="flex items-center justify-center h-screen bg-linear-to-t from-black via-black/5 to-black">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/70 backdrop-blur-lg space-y-6 z-50">
          <div className="grid grid-cols-2 gap-6 max-w-250 items-center justify-center">
            <div className="flex bg-white/30 backdrop-blur-lg h-full rounded-2xl p-6 flex-col items-start justify-center space-y-6">
              <h1 className="text-5xl font-bold">🎥 Vinema 3D</h1>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-red-500 to-orange-500">
                WebGL Unsupported
              </h1>
              <p className="text-xs font-bold text-white">
                Your browser does not support WebGL. Please use a different browser or device.
              </p>  
            </div>
            

            <div className="grid grid-cols-1 gap-6 text-white/90 h-full">
              <div className="bg-white/30 p-4 rounded-xl backdrop-blur-md">
                <h2 className="text-xl font-semibold mb-2">🌐 Powered by PeerJS</h2>
                <p className="text-sm leading-relaxed">
                  Vinema 3D connects hosts and viewers directly using <strong>PeerJS</strong>, 
                  enabling real-time, peer-to-peer video streaming without centralized servers.
                </p>
              </div>
              <div className="bg-white/30 p-4 rounded-xl backdrop-blur-md">
                <h2 className="text-xl font-semibold mb-2">🎬 Immersive with Three.js</h2>
                <p className="text-sm leading-relaxed">
                  Each viewing session takes place inside a 3D virtual environment — a digital theater powered by <strong>Three.js</strong>.
                </p>
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
