import React, { useState, useEffect, useRef } from "react";

interface Props {
  peerRef: React.MutableRefObject<any>;
  peerId: string;
  localStream: MediaStream | null;
  enableMic: () => void;
  disableMic: () => void;
  onStreamChange?: (stream: MediaStream | null) => void; // ✅ NEW
}

export default function HostControls({
  peerRef,
  peerId,
  localStream,
  enableMic,
  disableMic,
  onStreamChange,
}: Props) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [talking, setTalking] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isSharingTabAudio, setIsSharingTabAudio] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // 🖥️ Share screen with system audio
  const startScreenShare = async () => {
    if (isSharingScreen || isSharingTabAudio) return;
    
    try {
      // Request screen capture with system audio (Chrome 74+)
      const displayMediaOptions = {
        video: {
          cursor: 'always'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        },
        // @ts-ignore - systemAudio is not in the type definition but works in Chrome
        systemAudio: 'include' as const
      };

      // Get screen capture with audio
      const screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions as DisplayMediaStreamOptions);
      const videoTrack = screenStream.getVideoTracks()[0];
      
      // Handle when user stops sharing via browser UI
      videoTrack.onended = stopScreenShare;
      
      // Create a new stream with both screen and audio
      const combinedStream = new MediaStream();
      
      // Add screen video track
      if (videoTrack) {
        combinedStream.addTrack(videoTrack);
      }
      
      // Add audio tracks if available (system audio or microphone)
      const audioTracks = screenStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => combinedStream.addTrack(track));
      } else {
        // Fallback to microphone if no system audio is available
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
        } catch (audioError) {
          console.warn('Could not access microphone:', audioError);
        }
      }

      // Store the stream and update state
      streamRef.current = combinedStream;
      onStreamChange?.(combinedStream);
      
      setIsSharingScreen(true);
      setIsSharingTabAudio(audioTracks.length > 0);
      
      console.log('🖥️ Screen sharing with audio started');
      
    } catch (err) {
      console.error('Error starting screen share:', err);
      // Clean up on error
      stopScreenShare();
      alert('Failed to start screen sharing. Please try again.');
    }
  };

  const stopScreenShare = () => {
    try {
      // Stop all tracks in the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          streamRef.current?.removeTrack(track);
        });
        streamRef.current = null;
      }
      
      // Update parent component
      onStreamChange?.(null);
      
      // Reset state
      setIsSharingScreen(false);
      setIsSharingTabAudio(false);
      
      console.log('🛑 Screen sharing stopped');
    } catch (err) {
      console.error('Error stopping screen share:', err);
    }
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

  // Call handling is now managed by the parent component (video-room.tsx)

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
            onClick={
              isSharingScreen || isSharingTabAudio ? stopScreenShare : startScreenShare
            }
            className={`w-full px-4 py-2 rounded-xl font-medium ${
              isSharingScreen || isSharingTabAudio ? "bg-red-600" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {isSharingScreen || isSharingTabAudio ? "🛑 Stop Sharing" : "🖥️ Share Screen and Tab Audio"}
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
