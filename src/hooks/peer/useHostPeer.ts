// hooks/useHostPeer.ts
import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";

interface UseHostPeerOptions {
  localStreamRef: React.MutableRefObject<MediaStream | null>;
  onRemoteStream?: (stream: MediaStream) => void;
}

export function useHostPeer({ localStreamRef, onRemoteStream }: UseHostPeerOptions) {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    const peer = new Peer({
      host: "0.peerjs.com",
      port: 443,
      path: "/",
      secure: true,
      debug: 2,
    });

    peerRef.current = peer;

    peer.on("open", (id) => {
      setPeerId(id);
      setLoading(false);
      console.log("🟢 Host PeerJS connected:", id);
    });

    peer.on("call", (call) => {
      console.log("📞 Incoming viewer call:", call.peer);
      const localStream = localStreamRef.current;

      if (localStream) {
        call.answer(localStream);
      } else {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((fallbackStream) => call.answer(fallbackStream))
          .catch((err) => console.error("❌ Could not open fallback mic:", err));
      }

      call.on("stream", (remoteStream) => {
        console.log("📡 Received remote stream from viewer");
        onRemoteStream?.(remoteStream);
      });
    });

    peer.on("error", (err) => console.error("🚨 PeerJS error:", err));
    peer.on("disconnected", () => peer.reconnect());

    return () => {
      console.log("🧹 Destroying Host PeerJS instance");
      peer.destroy();
    };
  }, [localStreamRef, onRemoteStream]);

  return { peerRef, peerId, loading };
}
