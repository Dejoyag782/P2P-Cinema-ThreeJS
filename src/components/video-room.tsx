import { useRef, useState, useEffect } from "react";
import { useLocalAudio } from "../hooks/useLocalAudio";
import { useHostPeer } from "../hooks/peer/useHostPeer";
import { useViewerPeer } from "../hooks/peer/useViewerPeer";
import HostControls from "./host/host-controls";
import ViewerControls from "./viewer/viewer-controls";
import CinemaWrapper from "./cinema/CinemaWrapper";

export default function PeerVideoRoom() {
  const [role, setRole] = useState<"host" | "viewer" | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hostStream, setHostStream] = useState<MediaStream | null>(null);
  const [videoKey, setVideoKey] = useState(0);
  const [hostIdInput, setHostIdInput] = useState<string>("");

  const { audioRef, streamRef: localStream, enableMic, disableMic } = useLocalAudio(role ?? "");
  const hostVideoRef = useRef<HTMLVideoElement | null>(null);

  // ✅ Always call both hooks to keep hook order stable
  const hostPeer = useHostPeer({
    localStreamRef: localStream,
    onRemoteStream: setRemoteStream,
  });

  const viewerPeer = useViewerPeer({
    hostId: hostIdInput,
    onRemoteStream: setRemoteStream,
    localStreamRef: localStream,
  });

  // ✅ Only use data from the relevant one
  const peerRef = role === "host" ? hostPeer.peerRef : viewerPeer.peerRef;
  const peerId = role === "host" ? hostPeer.peerId : viewerPeer.peerId;
  const loading = role === "host" ? hostPeer.loading : viewerPeer.loading;

  // 🎞 Update viewer video when new remote stream arrives
  useEffect(() => {
    if (role === "viewer" && remoteStream) {
      setVideoKey((k) => k + 1);
    }
  }, [remoteStream, role]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {loading && <div className="absolute inset-0 flex items-center justify-center text-white">Loading...</div>}
      <audio ref={audioRef} className="hidden" />

      {/* ——— Role Selection ——— */}
      {!role && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/70 backdrop-blur-lg space-y-6 z-50">
          <div className="grid grid-cols-2 gap-6 max-w-250 items-center justify-center">
            <div className="flex bg-white/20 backdrop-blur-lg h-full rounded-2xl p-6 flex-col items-center justify-center space-y-6">
              <h1 className="text-5xl font-bold">🎥 Vinema 3D</h1>
              <p className="text-2xl">Are you a Host or Viewer?</p>
              <div className="flex space-x-4">
                <button onClick={() => setRole("host")} className="px-6 py-3 bg-blue-600 rounded-xl text-xl">
                  I’m the Host
                </button>
                <button onClick={() => setRole("viewer")} className="px-6 py-3 bg-green-600 rounded-xl text-xl">
                  I’m a Viewer
                </button>
              </div>
              {role === "viewer" && (
                <input
                  type="text"
                  placeholder="Enter Host Peer ID"
                  value={hostIdInput}
                  onChange={(e) => setHostIdInput(e.target.value)}
                  className="mt-4 p-2 rounded-lg text-black w-64 text-center"
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 text-white/90 h-full">
              <div className="bg-white/20 p-4 rounded-xl backdrop-blur-md">
                <h2 className="text-xl font-semibold mb-2">🌐 Powered by PeerJS</h2>
                <p className="text-sm leading-relaxed">
                  Vinema 3D connects hosts and viewers directly using <strong>PeerJS</strong>, 
                  enabling real-time, peer-to-peer video streaming without centralized servers.
                </p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl backdrop-blur-md">
                <h2 className="text-xl font-semibold mb-2">🎬 Immersive with Three.js</h2>
                <p className="text-sm leading-relaxed">
                  Each viewing session takes place inside a 3D virtual environment — a digital theater powered by <strong>Three.js</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ——— Host View ——— */}
      {role === "host" && (
        <>
          <HostControls
            peerRef={peerRef}
            peerId={peerId ?? ""}
            localStream={localStream.current}
            enableMic={enableMic}
            disableMic={disableMic}
            onStreamChange={setHostStream}
          />
          <CinemaWrapper
            key={videoKey}
            videoElement={hostVideoRef.current as any}
            videoStream={hostStream}
          />
        </>
      )}

      {/* ——— Viewer View ——— */}
      {role === "viewer" && (
        <>
          <ViewerControls
            peerRef={peerRef}
            localStream={localStream.current}
            onRemoteStream={setRemoteStream}
            enableMic={enableMic}
            disableMic={disableMic}
          />
          <CinemaWrapper
            key={`viewer-${videoKey}`}
            videoElement={hostVideoRef.current as any}
            videoStream={remoteStream}
          />
        </>
      )}
    </div>
  );
}
