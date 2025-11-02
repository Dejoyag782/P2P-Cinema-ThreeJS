// hooks/useLocalAudio.ts
import { useEffect, useRef, useCallback } from "react";

export function useLocalAudio(role?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!role) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;

        if (audioRef.current) {
          audioRef.current.srcObject = stream;
          audioRef.current.muted = true;
          audioRef.current.play().catch(() => {});
        }

        // Start with mic muted (push-to-talk)
        stream.getAudioTracks().forEach((t) => (t.enabled = false));
      })
      .catch((err) => {
        console.warn("⚠️ Could not get local audio stream:", err);
        // fallback: create empty stream so the app continues
        streamRef.current = new MediaStream();
      });
  }, [role]);

  const enableMic = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = true));
  }, []);

  const disableMic = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
  }, []);

  return { audioRef, streamRef, enableMic, disableMic };
}
