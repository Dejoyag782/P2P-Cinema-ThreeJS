import { useRef, useState, useEffect } from "react";
import { useLocalAudio } from "../hooks/useLocalAudio";
import { usePeer } from "../hooks/usePeer";
import HostControls from "./host/host-controls";
import ViewerControls from "./viewer/viewer-controls";
import CinemaWrapper from "./cinema/CinemaWrapper";

export default function PeerVideoRoom() {
  const [role, setRole] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [hostStream, setHostStream] = useState<MediaStream | null>(null);
  const [videoKey, setVideoKey] = useState(0);

  const { audioRef, streamRef: localStream, enableMic, disableMic } = useLocalAudio(role as string);
  const hostVideoRef = useRef<HTMLVideoElement | null>(null);

  const { peerRef, peerId, loading } = usePeer({
    onRemoteStream: setRemoteStream,
    localStreamRef: localStream,
  });

  // 🧩 Keep PeerJS listener up-to-date with host's active stream
  useEffect(() => {
    if (role !== "host") return;
    const peer = peerRef.current;
    if (!peer) return;

    const handleCall = (call: any) => {
      console.log("📞 Incoming viewer connection:", call.peer);

      const activeStream = hostStream || localStream.current;
      if (activeStream) {
        console.log("✅ Answering call with active host stream");
        call.answer(activeStream);
      } else {
        console.warn("⚠️ No stream active — cannot answer call");
        call.close();
      }

      call.on("error", (err: any) => console.error("❌ Host call error:", err));
    };

    peer.on("call", handleCall);

    return () => {
      peer.off("call", handleCall);
    };
  }, [role, hostStream, localStream]);


  useEffect(() => {
    if (role === "viewer" && remoteStream) setVideoKey((k) => k + 1);
  }, [remoteStream, role]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {loading && <div>Loading...</div>}
      <audio ref={audioRef} className="hidden" />

      {!role && (
        <>
         <CinemaWrapper
            key={videoKey}
            videoElement={hostVideoRef.current as any}
            videoStream={hostStream}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/70 backdrop-blur-lg space-y-6 z-50">
            <h1 className="text-3xl font-bold">🎥 Cinema 3D</h1>
            <p className="text-lg">Are you a Host or Viewer?</p>
            <div className="flex space-x-4">
              <button onClick={() => setRole("host")} className="px-6 py-3 bg-blue-600 rounded-xl">
                I’m the Host
              </button>
              <button onClick={() => setRole("viewer")} className="px-6 py-3 bg-green-600 rounded-xl">
                I’m a Viewer
              </button>
            </div>
          </div>
        </>
      )}

      {role === "host" && (
        <>
          <HostControls
            peerRef={peerRef}
            peerId={peerId as string}
            localStream={localStream.current}
            enableMic={enableMic}
            disableMic={disableMic}
            onStreamChange={setHostStream} // ✅ update current active stream
          />
          <CinemaWrapper
            key={videoKey}
            videoElement={hostVideoRef.current as any}
            videoStream={hostStream}
          />
        </>
      )}

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
            videoStream={remoteStream}
          />
        </>
      )}
    </div>
  );
}
