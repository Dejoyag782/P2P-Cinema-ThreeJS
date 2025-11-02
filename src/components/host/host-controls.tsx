import React, { useState, useEffect, useRef } from "react";
import type { RefObject } from "react";

interface Props {
  peerRef: React.MutableRefObject<any>;
  peerId: string;
  localStream: MediaStream | null;
  videoRef: RefObject<HTMLVideoElement>;
  enableMic: () => void;
  disableMic: () => void;
  onStreamChange?: (stream: MediaStream | null) => void; // ✅ NEW
}

export default function HostControls({
  peerRef,
  peerId,
  localStream,
  videoRef,
  enableMic,
  disableMic,
  onStreamChange,
}: Props) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [talking, setTalking] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // 🖥️ Share screen
  const startScreenShare = async () => {
    if (isSharingScreen) return;
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screen.getVideoTracks()[0].onended = stopScreenShare;

      const combined = new MediaStream([
        ...screen.getVideoTracks(),
        ...(localStream?.getAudioTracks() ?? []),
      ]);

      streamRef.current = combined;
      onStreamChange?.(combined);

      setIsSharingScreen(true);
      setIsStreaming(true);

      alert(`🖥️ Sharing screen! Room ID: ${peerId}`);
    } catch (err) {
      console.error(err);
    }
  };


  const stopScreenShare = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onStreamChange?.(null); // ✅ reset stream in parent
    setIsSharingScreen(false);
    setIsStreaming(false);
    alert("🛑 Screen sharing stopped");
  };

  // 🎙️ Push-to-Talk
  useEffect(() => {
    const down = (e: KeyboardEvent) => e.code === "Space" && (setTalking(true), enableMic());
    const up = (e: KeyboardEvent) => e.code === "Space" && (setTalking(false), disableMic());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [enableMic, disableMic]);

  // 🧩 ✅ Add this effect right here
  useEffect(() => {
    if (!peerRef.current) return;

    const peer = peerRef.current;

    const handleCall = (call: any) => {
      console.log("📞 Incoming viewer connection:", call.peer);
      if (streamRef.current) {
        call.answer(streamRef.current); // ✅ Answer with current screen stream
        console.log("✅ Answered call with active stream");
      } else {
        console.warn("⚠️ No stream active — cannot answer");
        call.close();
      }
    };

    peer.on("call", handleCall);

    return () => {
      peer.off("call", handleCall);
    };
  }, [peerRef]); // 👈 depends only on peerRef

  // Clean up streams when unmounted
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return (
    <>
      {/* Commented out video player since we’re only sharing the screen */}
      {/* <video ref={videoRef} className="hidden" /> */}

      <button
        onClick={() => setControlsVisible(!controlsVisible)}
        className="absolute top-6 right-6 z-50 bg-gray-900/70 text-white rounded-full p-3 shadow-lg"
      >
        ⚙️
      </button>

      {controlsVisible && (
        <div className="absolute top-20 right-6 bg-gray-900/85 text-white rounded-2xl p-5 w-80 space-y-4 shadow-lg z-50">
          <h2 className="text-xl font-semibold">Host Controls</h2>
          <p>
            Room ID: <span className="text-blue-400">{peerId}</span>
          </p>

          {/* Commented out file/video hosting controls */}
          {/*
          <input
            type="file"
            accept="video/*"
            onChange={handleFileLoad}
            className="block w-full text-sm text-gray-300 file:bg-blue-600 file:text-white file:rounded-md"
          />

          <button
            onClick={startHosting}
            disabled={!videoLoaded || isStreaming}
            className="w-full px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700"
          >
            {isStreaming ? "Streaming..." : "Start Streaming"}
          </button>
          */}

          <button
            onClick={isSharingScreen ? stopScreenShare : startScreenShare}
            className={`w-full px-4 py-2 rounded-xl font-medium ${
              isSharingScreen ? "bg-red-600" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {isSharingScreen ? "🛑 Stop Sharing" : "🖥️ Share Screen"}
          </button>

          <button
            onMouseDown={enableMic}
            onMouseUp={disableMic}
            onTouchStart={enableMic}
            onTouchEnd={disableMic}
            className={`w-full px-4 py-2 rounded-xl ${
              talking ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {talking ? "🎙️ Talking..." : "Hold to Talk"}
          </button>
        </div>
      )}
    </>
  );
}
