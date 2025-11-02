// hooks/usePeer.ts
import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";

interface UsePeerOptions {
  onRemoteStream?: (stream: MediaStream) => void;
  localStreamRef?: React.MutableRefObject<MediaStream | null>;
}

export function usePeer({ onRemoteStream, localStreamRef }: UsePeerOptions) {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    // ✅ Explicit PeerJS Cloud config — ensures both Host & Viewer use same signaling server
    const peer = new Peer({
      host: "0.peerjs.com",
      port: 443,
      path: "/",
      secure: true,
      debug: 2, // optional: helps see connection logs in console
    });

    peerRef.current = peer;

    peer.on("open", (id) => {
      setPeerId(id);
      setLoading(false);
      console.log("🟢 PeerJS connected. ID:", id);
    });

    peer.on("disconnected", () => {
      console.warn("⚠️ PeerJS disconnected — attempting reconnect");
      peer.reconnect();
    });

    peer.on("error", (err) => {
      console.error("🚨 PeerJS error:", err);
    });

    // 🔁 When someone calls this peer (HOST)
    peer.on("call", (call) => {
      console.log("📞 Incoming call from:", call.peer);

      const localStream = localStreamRef?.current;

      if (localStream) {
        console.log("✅ Answering call with current local stream");
        call.answer(localStream);
      } else {
        console.warn("⚠️ No local stream available — using fallback mic-only stream");
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((fallbackStream) => call.answer(fallbackStream))
          .catch((err) => console.error("❌ Could not open fallback mic:", err));
      }

      call.on("stream", (remoteStream) => {
        console.log("📡 Received remote stream from viewer");
        onRemoteStream?.(remoteStream);
      });

      call.on("close", () => console.log("🔴 PeerJS call closed"));
      call.on("error", (err) => console.error("❌ PeerJS call error:", err));
    });

    return () => {
      console.log("🧹 Destroying PeerJS instance");
      peer.destroy();
    };
  }, [onRemoteStream, localStreamRef]);

  return { peerRef, peerId, loading };
}
