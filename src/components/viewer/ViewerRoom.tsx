// src/components/viewer/ViewerRoom.tsx
import { useEffect, useRef, useState } from "react";
import Peer, { DataConnection, MediaConnection } from "peerjs";
import ThreeCinema from "../three/ThreeCinema";

interface ViewerRoomProps {
  hostId: string;
  gLTFUrl: string;
  peerServerConfig?: any;
}

export default function ViewerRoom({ hostId, gLTFUrl, peerServerConfig }: ViewerRoomProps) {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myId, setMyId] = useState("");
  const [connected, setConnected] = useState(false);
  const [streamReady, setStreamReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dataConnRef = useRef<DataConnection | null>(null);
  const mediaCallRef = useRef<MediaConnection | null>(null);

  // --------------------------------------------------
  // 🛰️ Initialize PeerJS (viewer)
  // --------------------------------------------------
  useEffect(() => {
    const p = new Peer(undefined as any, peerServerConfig as any);

    p.on("open", (id) => {
      console.log("✅ Viewer Peer ID:", id);
      setMyId(id);
    });

    setPeer(p);

    // Create hidden <video> for receiving stream
    const v = document.createElement("video");
    v.autoplay = true;
    v.playsInline = true;
    v.muted = false;
    v.controls = false;
    v.style.display = "none";
    document.body.appendChild(v);
    videoRef.current = v;

    return () => {
      v.pause();
      v.srcObject = null;
      v.remove();
      p.destroy();
    };
  }, [peerServerConfig]);

  // --------------------------------------------------
  // 🔗 Connect to host and receive media stream
  // --------------------------------------------------
  useEffect(() => {
    if (!peer || !hostId) return;

    const conn = peer.connect(hostId);
    dataConnRef.current = conn;

    conn.on("open", () => {
      console.log("🔗 Connected to host data channel");
      setConnected(true);

      conn.on("data", (msg: any) => {
        handleHostMessage(msg);
      });

      // Ask host to start media call
      conn.send({ type: "ready-for-stream", id: peer.id });
    });

    // Listen for host calling us
    peer.on("call", (call) => {
      console.log("☎️ Host calling viewer with stream...");
      mediaCallRef.current = call;
      call.answer(); // we don’t send any local media
      call.on("stream", (remoteStream) => {
        attachStream(remoteStream);
      });
    });

    return () => {
      conn.close();
    };
  }, [peer, hostId]);

  // --------------------------------------------------
  // 🎞️ Attach stream to video element
  // --------------------------------------------------
  const attachStream = (stream: MediaStream) => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    videoRef.current.play().catch(() => {});
    setStreamReady(true);
  };

  // --------------------------------------------------
  // 🎛️ Handle sync commands from host
  // --------------------------------------------------
  const handleHostMessage = (msg: any) => {
    if (!videoRef.current) return;
    switch (msg.type) {
      case "play":
        videoRef.current.currentTime = msg.currentTime ?? videoRef.current.currentTime;
        videoRef.current.play().catch(() => {});
        break;
      case "pause":
        videoRef.current.pause();
        break;
      case "seek":
        videoRef.current.currentTime = msg.currentTime;
        break;
      case "time":
        syncToHost(msg.currentTime);
        break;
      default:
        console.log("Unhandled host message:", msg);
    }
  };

  // --------------------------------------------------
  // ⏱️ Simple drift correction
  // --------------------------------------------------
  const syncToHost = (hostTime: number) => {
    const v = videoRef.current;
    if (!v) return;

    const local = v.currentTime;
    const diff = hostTime - local;
    if (Math.abs(diff) > 0.5) {
      v.currentTime = hostTime;
    } else if (Math.abs(diff) > 0.05) {
      const original = v.playbackRate;
      v.playbackRate = diff > 0 ? 1.02 : 0.98;
      setTimeout(() => {
        v.playbackRate = original;
      }, 1000);
    }
  };

  // --------------------------------------------------
  // 🖥️ Render
  // --------------------------------------------------
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* 🎬 Fullscreen 3D Scene */}
      <div className="absolute inset-0 z-0">
        <ThreeCinema gLTFUrl={gLTFUrl} videoElement={videoRef.current ?? undefined} />
      </div>

      {/* 🧭 Floating status panel */}
      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-sm text-white p-4 rounded-xl max-w-xs">
        <h2 className="text-lg font-semibold mb-2">🎥 Viewer Room</h2>
        <p className="text-sm mb-1">
          <span className="opacity-70">Your ID:</span> <strong>{myId || "..."}</strong>
        </p>
        <p className="text-sm mb-2">
          <span className="opacity-70">Host:</span> <strong>{hostId}</strong>
        </p>
        <div className="text-xs space-y-1 mt-2">
          <p>🛰️ Connection: {connected ? "✅ Connected" : "⌛ Waiting..."}</p>
          <p>🎞️ Stream: {streamReady ? "🎬 Ready" : "🔄 Loading..."}</p>
        </div>
      </div>
    </div>
  );
}
