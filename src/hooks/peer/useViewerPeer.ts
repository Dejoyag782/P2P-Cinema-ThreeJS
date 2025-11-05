// hooks/useViewerPeer.ts
import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";

interface UseViewerPeerOptions {
  hostId: string;
  onRemoteStream?: (stream: MediaStream) => void;
  localStreamRef?: React.MutableRefObject<MediaStream | null>;
}

export function useViewerPeer({ hostId, onRemoteStream, localStreamRef }: UseViewerPeerOptions) {
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
      console.log("🟢 Viewer PeerJS connected:", id);

      const localStream = localStreamRef?.current;

      const callHost = (stream: MediaStream | null) => {
        if (!hostId) {
          console.error("❌ No host ID provided");
          return;
        }

        console.log("📞 Calling host:", hostId);
        const call = peer.call(hostId, stream || undefined as any);

        call.on("stream", (remoteStream) => {
          console.log("📡 Received remote stream from host");
          onRemoteStream?.(remoteStream);
        });

        call.on("close", () => console.log("🔴 Call closed"));
        call.on("error", (err) => console.error("❌ Call error:", err));
      };

      if (localStream) {
        callHost(localStream);
      } else {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((fallbackStream) => callHost(fallbackStream))
          .catch((err) => console.error("❌ Could not open fallback mic:", err));
      }
    });

    peer.on("error", (err) => console.error("🚨 PeerJS error:", err));
    peer.on("disconnected", () => peer.reconnect());

    return () => {
      console.log("🧹 Destroying Viewer PeerJS instance");
      peer.destroy();
    };
  }, [hostId, onRemoteStream, localStreamRef]);

  return { peerRef, peerId, loading };
}
