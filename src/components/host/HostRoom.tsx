// src/components/host/HostRoom.tsx
import { useEffect, useRef, useState } from "react";
import Peer, { DataConnection, MediaConnection } from "peerjs";
import ThreeCinema from "../three/ThreeCinema";
import HostVideoWithSubtitles from "./HostVideoWithSubtitles";

type ViewerConn = {
  id: string;
  call?: MediaConnection;
};

interface HostRoomProps {
  peerServerConfig?: any;
  gLTFUrl: string;
}

export default function HostRoom({ peerServerConfig, gLTFUrl }: HostRoomProps) {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState("");
  const [viewers, setViewers] = useState<ViewerConn[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dataConnsRef = useRef<Record<string, DataConnection>>({});

  // --------------------------------------------------
  // 🛰️ Initialize PeerJS host
  // --------------------------------------------------
  useEffect(() => {
    const p = new Peer(undefined as any, peerServerConfig as any);

    p.on("open", (id) => {
      console.log("✅ Host Peer ID:", id);
      setPeerId(id);
    });

    // When a viewer connects via data channel
    p.on("connection", (conn) => {
      console.log("📡 Viewer connected:", conn.peer);
      dataConnsRef.current[conn.peer] = conn;

      // Track viewer immediately
      setViewers((prev) =>
        prev.find((v) => v.id === conn.peer) ? prev : [...prev, { id: conn.peer }]
      );

      conn.on("open", () => {
        conn.on("data", (msg) => {
          console.log("📩 From viewer:", msg);

          // Viewer indicates readiness to receive stream
          if ((msg as any)?.type === "ready-for-stream" && streamRef.current && peer) {
            console.log("🎥 Sending stream to viewer:", (msg as any)?.id);
            const mediaCall = peer.call((msg as any)?.id, streamRef.current);

            mediaCall.on("close", () => {
              console.log("❌ Viewer disconnected:", (msg as any)?.id);
              setViewers((prev) => prev.filter((v) => v.id !== (msg as any)?.id));
            });

            setViewers((prev) =>
              prev.find((v) => v.id === (msg as any)?.id)
                ? prev
                : [...prev, { id: (msg as any)?.id, call: mediaCall }]
            );
          }
        });
      });
    });

    // If a viewer initiates a call (rare but valid)
    p.on("call", (call) => {
      console.log("☎️ Incoming call from viewer:", call.peer);
      if (streamRef.current) call.answer(streamRef.current);
      else call.answer();
    });

    setPeer(p);
    return () => p.destroy();
  }, [peerServerConfig]);

  // --------------------------------------------------
  // 🎞️ Handle video file upload + create stream
  // --------------------------------------------------
  const handleFile = async (file: File) => {
    if (!videoRef.current) return;

    const v = videoRef.current;
    v.src = URL.createObjectURL(file);
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;

    try {
      await v.play();
    } catch (err) {
      console.warn("⚠️ Autoplay blocked; user gesture required", err);
    }

    const stream = (v as any).captureStream?.() ?? null;
    if (!stream) {
      alert("Browser does not support captureStream()");
      return;
    }

    streamRef.current = stream;

    // Send to all already-connected viewers
    Object.keys(dataConnsRef.current).forEach((id) => {
      const mediaCall = peer!.call(id, stream);
      mediaCall.on("close", () => {
        console.log("❌ Stream to viewer closed:", id);
      });

      setViewers((prev) =>
        prev.find((v) => v.id === id as any) ? prev : [...prev, { id: id as any, call: mediaCall }]
      );
    });
  };

  // --------------------------------------------------
  // 📡 Broadcast commands to all viewers
  // --------------------------------------------------
  const broadcast = (msg: any) => {
    Object.values(dataConnsRef.current).forEach((c) => {
      if (c.open) c.send(msg);
    });
  };

  // --------------------------------------------------
  // ▶️ Playback controls
  // --------------------------------------------------
  const handlePlay = () => {
    videoRef.current?.play();
    setIsPlaying(true);
    broadcast({ type: "play", ts: Date.now(), currentTime: videoRef.current?.currentTime });
  };

  const handlePause = () => {
    videoRef.current?.pause();
    setIsPlaying(false);
    broadcast({ type: "pause", ts: Date.now(), currentTime: videoRef.current?.currentTime });
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      broadcast({ type: "seek", ts: Date.now(), currentTime: 0 });
    }
  };

  // --------------------------------------------------
  // ⏱️ Periodic time sync
  // --------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoRef.current) return;
      broadcast({
        type: "time",
        ts: Date.now(),
        currentTime: videoRef.current.currentTime,
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // --------------------------------------------------
  // 🖥️ Render
  // --------------------------------------------------
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* 🎬 Fullscreen Three.js Scene */}
      <div className="absolute inset-0 z-0">
        <ThreeCinema gLTFUrl={gLTFUrl} videoElement={videoRef.current ?? undefined} />
      </div>

      {/* 🎥 Hidden Host Video */}
      <video ref={videoRef} playsInline muted autoPlay style={{ display: "none" }} />

      {/* 🧭 Floating Control Panel */}
      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-sm text-white p-4 rounded-xl max-w-xs">
        <h2 className="text-lg font-semibold mb-2">🎬 Host Room</h2>
        <p className="text-sm mb-2">
          <span className="opacity-80">Peer ID:</span>{" "}
          <strong>{peerId || "..."}</strong>
        </p>

        <input
          type="file"
          accept="video/*"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          className="block w-full mb-3 text-sm"
        />

        <div className="flex space-x-2 mb-3">
          {!isPlaying ? (
            <button
              onClick={handlePlay}
              className="px-3 py-1 bg-white text-black rounded hover:bg-gray-200"
            >
              ▶ Play
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="px-3 py-1 bg-white text-black rounded hover:bg-gray-200"
            >
              ⏸ Pause
            </button>
          )}
          <button
            onClick={handleRestart}
            className="px-3 py-1 bg-white text-black rounded hover:bg-gray-200"
          >
            🔁 Restart
          </button>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-1">Viewers:</h3>
          <ul className="text-xs max-h-24 overflow-y-auto space-y-1">
            {viewers.length === 0 && <li className="opacity-60">None yet</li>}
            {viewers.map((v) => (
              <li key={v.id} className="truncate">
                {v.id}
              </li>
            ))}
          </ul>
        </div>

        {/* 🎞️ Subtitle Upload + Broadcast */}
        <HostVideoWithSubtitles
          videoRef={videoRef as any}
          isHost={true}
          broadcast={broadcast}
        />


      </div>
    </div>
  );
}
