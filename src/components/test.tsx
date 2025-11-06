import { useState, useRef, useEffect } from "react";
import Peer from "peerjs";
import CinemaVideo from "./cinema/Cinema";
import CinemaModel from "../assets/glb/cinema.glb";

export default function PeerVideoRoom() {
  const [role, setRole] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [peerId, setPeerId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  const peerRef = useRef<Peer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // --- Initialize PeerJS ---
  useEffect(() => {
    setLoading(true);
    const peer = new Peer();

    peer.on("open", (id) => {
      console.log("My Peer ID:", id);
      setPeerId(id);
      setLoading(false);
    });

    peer.on("call", (call) => {
      console.log("Incoming stream from peer...");
      setLoading(true);

      // Answer call with local audio if available
      const answerStream = new MediaStream();
      localStreamRef.current?.getAudioTracks().forEach((track) => answerStream.addTrack(track));
      call.answer(answerStream);

      call.on("stream", (stream) => {
        setRemoteStream(stream);
        setLoading(false);
      });
    });

    peerRef.current = peer;
    return () => peer.destroy();
  }, []);

  // --- Capture microphone ---
  useEffect(() => {
    if (!role) return;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        localStreamRef.current = stream;
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream;
          localAudioRef.current.muted = true;
          localAudioRef.current.play().catch(() => {});
        }
      })
      .catch((err) => {
        console.error("Microphone access denied:", err);
      });
  }, [role]);

  // --- HOST LOGIC ---
  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (videoRef.current) videoRef.current.src = url;

    videoRef.current
      ?.play()
      .then(() => setVideoLoaded(true))
      .catch(() => setVideoLoaded(false));
    setIsPlaying(true);
  };

  const startHosting = () => {
    if (!videoLoaded) return;

    const videoStream = (videoRef.current as any)?.captureStream();
    const combinedStream = new MediaStream();

    videoStream?.getVideoTracks().forEach((track: any) => combinedStream.addTrack(track));
    localStreamRef.current?.getAudioTracks().forEach((track: any) => combinedStream.addTrack(track));

    streamRef.current = combinedStream;
    setIsStreaming(true);

    peerRef.current?.on("connection", (conn) => {
      console.log("Viewer connected:", conn.peer);
      const call = peerRef.current?.call(conn.peer, streamRef.current as MediaStream);
      call?.on("error", (err) => console.error("Call error:", err));
    });

    alert(`Now hosting! Share this Room ID: ${peerId}`);
  };

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // --- VIEWER LOGIC ---
  const joinRoom = () => {
    if (!roomId) return alert("Enter a room ID first!");
    setLoading(true);

    const conn = peerRef.current?.connect(roomId);
    conn?.on("open", () => {
      console.log("Connected to host. Waiting for stream...");

      const audioStream = localStreamRef.current as MediaStream;
      const call = peerRef.current?.call(roomId, audioStream);
      call?.on("stream", (stream) => {
        setRemoteStream(stream);
        setLoading(false);
      });
    });
  };

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // --- Role selection ---
  const selectRole = (chosenRole: string) => {
    setRole(chosenRole);
    setTimeout(() => setShowIntro(false), 300);
  };

  return (
    <div className="relative w-screen h-screen bg-linear-to-t from-black via-gray-900 to-black overflow-hidden">
      {/* Loader */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
          <div className="loader border-4 border-t-4 border-blue-600 rounded-full w-16 h-16 animate-spin"></div>
        </div>
      )}

      {/* Local audio for microphone */}
      <audio ref={localAudioRef} className="hidden" />

      {/* --- Background Video / 3D Cinema --- */}
      {role === "host" ? (
        <>
          <video ref={videoRef} className="hidden" />
          {videoRef.current && (
            <CinemaVideo
              key="host-cinema"
              // videoElement={videoRef.current}
              modelUrl={CinemaModel}
              width={window.innerWidth}
              height={window.innerHeight}
            />
          )}
        </>
      ) : (
        <>
          <video ref={remoteVideoRef} className="hidden" />
          {remoteStream && remoteVideoRef.current && (
            <CinemaVideo
              key="viewer-cinema"
              // videoStream={remoteStream}
              modelUrl={CinemaModel}
              width={window.innerWidth}
              height={window.innerHeight}
            />
          )}
        </>
      )}

      {/* --- Intro / Role Selection --- */}
      {showIntro && (
        <>
          <CinemaVideo
            key="intro-cinema"
            modelUrl={CinemaModel}
            width={window.innerWidth}
            height={window.innerHeight}
          />
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center bg-linear-to-t from-gray-900/70 via-black/70 to-gray-900/70 backdrop-blur-lg text-white space-y-6 transition-opacity duration-300 z-50 ${
              role ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <div className="bg-gray-100/10 backdrop-blur-lg p-6 rounded-lg flex flex-col space-y-6">
              <h1 className="text-3xl font-bold">🎥 Vinema 3D</h1>
              <p className="text-lg font-medium">Are you a Host or Viewer?</p>
              <div className="flex space-x-4">
                <button
                  onClick={() => selectRole("host")}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 transition rounded-xl shadow-md"
                >
                  I’m the Host
                </button>
                <button
                  onClick={() => selectRole("viewer")}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 transition rounded-xl shadow-md"
                >
                  I’m a Viewer
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- Floating Toggle Button & Controls --- */}
      {role && (
        <>
          <button
            onClick={() => setControlsVisible(!controlsVisible)}
            className="absolute top-6 right-6 z-20 bg-gray-900/70 hover:bg-gray-800 transition text-white rounded-full p-3 shadow-lg border border-gray-700"
            title={controlsVisible ? "Hide Controls" : "Show Controls"}
          >
            ⚙️
          </button>

          <div
            className={`absolute top-20 right-6 z-10 transition-all duration-300 transform ${
              controlsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 pointer-events-none -translate-y-5"
            }`}
          >
            <div className="bg-gray-900/85 backdrop-blur-md border border-gray-700 rounded-2xl p-5 w-80 text-white shadow-lg space-y-4">
              {role === "host" && (
                <>
                  <h2 className="text-xl font-semibold mb-2">Host Controls</h2>
                  <p className="text-sm">
                    Room ID:{" "}
                    <span className="font-mono bg-gray-800 px-2 py-1 rounded text-blue-400">
                      {peerId || "Loading..."}
                    </span>
                  </p>

                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileLoad}
                    className="block w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />

                  {videoLoaded && (
                    <div className="flex space-x-3">
                      <button
                        onClick={handlePlay}
                        disabled={isPlaying}
                        className={`flex-1 px-4 py-2 rounded-xl font-medium transition ${
                          isPlaying
                            ? "bg-gray-700 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        ▶ Play
                      </button>
                      <button
                        onClick={handlePause}
                        disabled={!isPlaying}
                        className={`flex-1 px-4 py-2 rounded-xl font-medium transition ${
                          !isPlaying
                            ? "bg-gray-700 cursor-not-allowed"
                            : "bg-yellow-500 hover:bg-yellow-600"
                        }`}
                      >
                        ⏸ Pause
                      </button>
                    </div>
                  )}

                  <button
                    onClick={startHosting}
                    disabled={!videoLoaded || isStreaming}
                    className={`mt-2 px-6 py-3 w-full rounded-xl font-medium transition ${
                      videoLoaded && !isStreaming
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-700 cursor-not-allowed"
                    }`}
                  >
                    {isStreaming ? "Streaming..." : "Start Streaming"}
                  </button>
                </>
              )}

              {role === "viewer" && (
                <>
                  <h2 className="text-xl font-semibold mb-2">Viewer Controls</h2>
                  <input
                    type="text"
                    placeholder="Enter Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="border border-gray-700 bg-gray-800 text-white p-2 rounded-lg w-full focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <button
                    onClick={joinRoom}
                    className="mt-3 px-6 py-3 w-full bg-green-600 hover:bg-green-700 rounded-xl transition font-medium"
                  >
                    Join Room
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* --- Loader CSS --- */}
      <style>{`
        .loader {
          border-top-color: #3498db;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}