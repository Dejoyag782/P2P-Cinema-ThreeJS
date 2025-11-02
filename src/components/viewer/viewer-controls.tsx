import { useState, useEffect } from "react";

interface Props {
  peerRef: any;
  localStream: MediaStream | null;
  onRemoteStream: (stream: MediaStream) => void;
  enableMic: () => void;
  disableMic: () => void;
}

export default function ViewerControls({
  peerRef,
  localStream,
  onRemoteStream,
  enableMic,
  disableMic,
}: Props) {
  const [roomId, setRoomId] = useState("");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [talking, setTalking] = useState(false);

  const joinRoom = async () => {
    if (!roomId.trim()) return alert("❗ Enter a room ID!");
    if (!peerRef?.current) return alert("❗ Peer not ready yet");

    console.log("🟢 Attempting to join room:", roomId);

    let outgoingStream = localStream;

    // ✅ Always have a valid stream
    if (!outgoingStream) {
      try {
        outgoingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("🎧 Created fallback audio stream");
      } catch (err) {
        console.warn("⚠️ Could not access mic, creating silent stream");
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const dest = audioContext.createMediaStreamDestination();
        oscillator.connect(dest);
        oscillator.start();
        outgoingStream = dest.stream;
      }
    }

    let call;
    try {
      call = peerRef.current.call(roomId.trim(), outgoingStream);
    } catch (err) {
      console.error("❌ peer.call() threw an error:", err);
      alert("Failed to start call. Check console for details.");
      return;
    }

    if (!call || typeof call.on !== "function") {
      console.error("⚠️ peer.call() returned invalid object:", call);
      alert("Could not connect. Make sure the host is online and room ID is correct.");
      return;
    }

    call.on("stream", (stream: MediaStream) => {
      console.log("📡 Received remote stream:", stream);
      onRemoteStream(stream);
    });

    call.on("close", () => console.log("🔴 Call ended"));
    call.on("error", (err: any) => console.error("⚠️ Call error:", err));
  };


  // 🎙️ Push-to-Talk (Spacebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !talking) {
        setTalking(true);
        enableMic();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setTalking(false);
        disableMic();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [talking, enableMic, disableMic]);

  return (
    <>
      {/* ⚙️ Toggle button */}
      <button
        onClick={() => setControlsVisible(!controlsVisible)}
        className="absolute top-6 right-6 z-20 bg-gray-900/70 hover:bg-gray-800 text-white rounded-full p-3 shadow-lg border border-gray-700"
        title={controlsVisible ? "Hide Controls" : "Show Controls"}
      >
        ⚙️
      </button>

      {/* 🧭 Controls Panel */}
      <div
        className={`absolute top-20 right-6 z-10 transition-all duration-300 transform bg-gray-900/70 backdrop-blur-md border border-gray-700 rounded-2xl p-5 w-80 text-white shadow-lg space-y-4 ${
          controlsVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 pointer-events-none -translate-y-5"
        }`}
      >
        <h2 className="text-xl font-semibold mb-4">Viewer Controls</h2>

        <input
          type="text"
          placeholder="Enter Host Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="border border-gray-700 bg-gray-800 text-white p-2 rounded-lg w-full"
        />

        <button
          onClick={joinRoom}
          className="mt-3 px-6 py-3 w-full bg-green-600 hover:bg-green-700 rounded-xl transition font-medium"
        >
          Join Room
        </button>

        <button
          onMouseDown={enableMic}
          onMouseUp={disableMic}
          onTouchStart={enableMic}
          onTouchEnd={disableMic}
          disabled={!localStream}
          className={`mt-4 px-6 py-3 w-full rounded-xl transition font-medium ${
            talking
              ? "bg-red-600"
              : localStream
              ? "bg-gray-700 hover:bg-gray-600"
              : "bg-gray-800 cursor-not-allowed opacity-60"
          }`}
        >
          {localStream
            ? talking
              ? "🎙️ Talking..."
              : "Hold to Talk"
            : "🎧 Mic Unavailable"}
        </button>
      </div>
    </>
  );
}
