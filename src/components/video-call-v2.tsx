import { useCallback, useEffect, useRef, useState } from "react";
import Peer, { MediaConnection, DataConnection } from "peerjs";
import CinemaWrapper from "./cinema/CinemaWrapper";
import { Copy, GalleryThumbnails, MessageCircleMore, Mic, MicOff, Phone, ScreenShare, Settings, User, Video, VideoOff, XCircle } from "lucide-react";

type SeatOption = {
  id: string;
  label: string;
  row: string;
  description: string;
  cameraPosition: [number, number, number];
};

const SEAT_X_POSITIONS = [
  -5.50,
  -5.15,
  -4.80,
  -4.45,
  -4.10,
  -3.75,
  -3.50,
  -3.15,
  -2.1,
  -1.75,
  -1.4,
  -1.05,
  -0.7,
  -0.35,
  0,
  0.35,
  0.7,
  1.05,
  1.4,
  1.75,
  2.1,
  3.15,
  3.50,
  3.75,
  4.10,
  4.45,
  4.80,
  5.15,
  5.50
];
const SEAT_ROWS: { key: SeatOption["row"]; label: string; y: number; z: number; maxSeats: number }[] = [
  { key: "front2", label: "Front Row", y: 1, z: -1, maxSeats: 29 },
  { key: "front1", label: "Front Row", y: 1.3, z: -0.3, maxSeats: 29 },
  { key: "front", label: "Front Row", y: 1.6, z: 0.4, maxSeats: 29 },
  { key: "mid4", label: "Middle Row", y: 2.0, z: 1.1, maxSeats: 29 },
  { key: "mid3", label: "Middle Row", y: 2.3, z: 1.9, maxSeats: 29 },
  { key: "mid2", label: "Middle Row", y: 2.7, z: 2.6, maxSeats: 29 },
  { key: "mid1", label: "Middle Row", y: 3, z: 3.3, maxSeats: 29 },
  { key: "back4", label: "Back Row", y: 3.4, z: 4, maxSeats: 29 },
  { key: "back3", label: "Back Row", y: 3.7, z: 4.7, maxSeats: 25 },
  { key: "back2", label: "Back Row", y: 3.9, z: 5.4, maxSeats: 23 },
  { key: "back", label: "Back Row", y: 4.2, z: 6, maxSeats: 9 },
];

const getCenteredSeatPositions = (maxSeats: number) => {
  const clamped = Math.max(1, Math.min(SEAT_X_POSITIONS.length, maxSeats));
  const middleIndex = Math.floor(SEAT_X_POSITIONS.length / 2);
  const half = Math.floor(clamped / 2);
  const start = Math.max(0, middleIndex - half);
  return SEAT_X_POSITIONS.slice(start, start + clamped);
};

const SEAT_OPTIONS: SeatOption[] = SEAT_ROWS.flatMap((row) =>
  getCenteredSeatPositions(row.maxSeats).map((x, index) => {
    const seatNumber = index + 1;
    const isCenter = x === 0;
    const sideLabel = x < 0 ? "L" : x > 0 ? "R" : "C";
    return {
      id: `${row.key}-${seatNumber}`,
      label: `${row.label} ${sideLabel}${seatNumber}`,
      row: row.key,
      description: isCenter ? "Centered view" : x < 0 ? "Left angle view" : "Right angle view",
      cameraPosition: [x, row.y, row.z],
    };
  })
);

export default function VideoCall() {
  const [mode, setMode] = useState<null | "host" | "join">(null);
  const [peerId, setPeerId] = useState("");
  const [remoteId, setRemoteId] = useState("");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [viewerConnCount, setViewerConnCount] = useState(0);
  const [connectedViewerIds, setConnectedViewerIds] = useState<string[]>([]);
//   const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoHidden, setIsVideoHidden] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [copied, setCopied] = useState(false);
  const [messagesVisible, setMessagesVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [seatOptionsVisible, setSeatOptionsVisible] = useState(false);
  const [selectedSeatId, setSelectedSeatId] = useState("mid2-10");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [assetsProgress, setAssetsProgress] = useState(0);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);


  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const hostCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const hostDataConnsRef = useRef<Map<string, DataConnection>>(new Map());
  const joinerCallRef = useRef<MediaConnection | null>(null);
  const joinerDataConnRef = useRef<DataConnection | null>(null);
  const selectedSeat =
    SEAT_OPTIONS.find((seat) => seat.id === selectedSeatId) ?? SEAT_OPTIONS[0];
  const maxSeatsInRow = Math.max(
    ...SEAT_ROWS.map((row) => SEAT_OPTIONS.filter((seat) => seat.row === row.key).length)
  );
  const seatButtonWidthRem = 2.5;
  const seatGapRem = 0.400;
  const seatPanelHorizontalPaddingRem = 2.5;
  const seatPanelWidthRem =
    maxSeatsInRow * seatButtonWidthRem +
    Math.max(0, maxSeatsInRow - 1) * seatGapRem +
    seatPanelHorizontalPaddingRem;
  const progressPercent = Math.round(Math.min(1, Math.max(0, assetsProgress)) * 100);
  const progressBarWidth = Math.max(12, progressPercent);

  useEffect(() => {
    setIsMobile(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const syncHostViewerState = () => {
    const viewerIds = Array.from(
      new Set([
        ...Array.from(hostCallsRef.current.keys()),
        ...Array.from(hostDataConnsRef.current.keys()),
      ])
    ).sort();
    setConnectedViewerIds(viewerIds);
    setViewerConnCount(viewerIds.length);
  };

  const disconnectViewer = (viewerId: string) => {
    const call = hostCallsRef.current.get(viewerId);
    if (call) {
      call.close();
      hostCallsRef.current.delete(viewerId);
    }

    const conn = hostDataConnsRef.current.get(viewerId);
    if (conn) {
      conn.close();
      hostDataConnsRef.current.delete(viewerId);
    }

    syncHostViewerState();
  };

  const ensureLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  };

  const closeAllConnections = () => {
    hostCallsRef.current.forEach((call) => call.close());
    hostCallsRef.current.clear();

    hostDataConnsRef.current.forEach((conn) => conn.close());
    hostDataConnsRef.current.clear();

    joinerCallRef.current?.close();
    joinerCallRef.current = null;

    joinerDataConnRef.current?.close();
    joinerDataConnRef.current = null;

    setViewerConnCount(0);
    setConnectedViewerIds([]);
  };

  const copyToClipboard = () => {
    if (peerId) {
      navigator.clipboard
        .writeText(peerId)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
        .catch(err => console.error('Failed to copy:', err));
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Initialize peer for host or joiner mode
  useEffect(() => {
    if (!mode) return;

    const p = new Peer();
    setPeer(p);

    p.on("open", async (id) => {
      setPeerId(id);
      if (mode === "host") {
        try {
          await ensureLocalStream();
        } catch (error) {
          console.error("Failed to access host media:", error);
        }
      }
    });

    // Host receives calls from many joiners and answers each with host media.
    p.on("call", async (call) => {
      if (mode !== "host") return;
      try {
        const stream = await ensureLocalStream();
        call.answer(stream);
        hostCallsRef.current.set(call.peer, call);
        syncHostViewerState();

        call.on("close", () => {
          hostCallsRef.current.delete(call.peer);
          syncHostViewerState();
        });

        call.on("error", () => {
          hostCallsRef.current.delete(call.peer);
          syncHostViewerState();
        });
      } catch (error) {
        console.error("Failed to answer incoming call:", error);
      }
    });

    // Chat connections: host stores many, joiner stores one.
    p.on("connection", (conn) => {
      if (mode === "host") {
        hostDataConnsRef.current.set(conn.peer, conn);
        syncHostViewerState();
        conn.on("data", (data) => {
          setMessages((prev) => [...prev, { sender: conn.peer, text: String(data) }]);
        });
        conn.on("close", () => {
          hostDataConnsRef.current.delete(conn.peer);
          syncHostViewerState();
        });
        conn.on("error", () => {
          hostDataConnsRef.current.delete(conn.peer);
          syncHostViewerState();
        });
      } else {
        joinerDataConnRef.current = conn;
        conn.on("data", (data) => {
          setMessages((prev) => [...prev, { sender: "Host", text: String(data) }]);
        });
      }
    });

    p.on("error", (error) => console.error("Peer error:", error));

    return () => {
      closeAllConnections();
      p.destroy();
      setPeer(null);
      setPeerId("");
    };
  }, [mode]);

  const startCall = () => {
    if (!peer || !remoteId) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        const call = peer.call(remoteId, stream);
        if (!call) return;
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        call.on("stream", (remoteStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          remoteStreamRef.current = remoteStream;
        });

        joinerCallRef.current = call;
        call.on("close", () => {
          joinerCallRef.current = null;
          remoteStreamRef.current = null;
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        });
        // setIsCalling(true);
      })
      .catch(console.error);

    const conn = peer.connect(remoteId);
    conn.on("open", () => {
      joinerDataConnRef.current = conn;
    });
    conn.on("data", (data) => {
      setMessages((prev) => [...prev, { sender: "Host", text: String(data) }]);
    });
    conn.on("close", () => {
      joinerDataConnRef.current = null;
    });
  };

  const endCall = () => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setIsSharingScreen(false);

    closeAllConnections();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setMessages([]);
    setMode(null);
  };

  const sendMessage = () => {
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    if (mode === "host") {
      hostDataConnsRef.current.forEach((conn) => {
        if (conn.open) conn.send(trimmed);
      });
      setMessages((prev) => [...prev, { sender: "Host", text: trimmed }]);
    } else {
      const conn = joinerDataConnRef.current;
      if (!conn?.open) return;
      conn.send(trimmed);
      setMessages((prev) => [...prev, { sender: "You", text: trimmed }]);
    }

    setInputMessage("");
  };

  const toggleScreenShare = async () => {
    if (isSharingScreen) stopScreenShare();
    else startScreenShare();
  };

  const startScreenShare = async () => {
    try {
      const hasAnyCall =
        mode === "host" ? hostCallsRef.current.size > 0 : Boolean(joinerCallRef.current);
      if (!hasAnyCall) {
        alert("You must be in a call to share your screen.");
        return;
      }

      // Request screen stream (try to include system audio)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true, // Will only work for tab audio on Chrome/Edge
      });

      // Request mic audio
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // --- Combine system audio (if any) and mic audio ---
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      const hasScreenAudio = screenStream.getAudioTracks().length > 0;

      if (hasScreenAudio) {
        const screenAudioSource = audioContext.createMediaStreamSource(screenStream);
        screenAudioSource.connect(destination);
      }

      const micAudioSource = audioContext.createMediaStreamSource(micStream);
      micAudioSource.connect(destination);

      // Combine video + mixed audio
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      screenStreamRef.current = screenStream;
      setIsSharingScreen(true);

      // --- Replace the video track in the call ---
      const videoTrack = combinedStream.getVideoTracks()[0];
      const replaceVideoInCall = (call: MediaConnection) => {
        const sender = call.peerConnection
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
      };

      if (mode === "host") {
        hostCallsRef.current.forEach(replaceVideoInCall);
      } else if (joinerCallRef.current) {
        replaceVideoInCall(joinerCallRef.current);
      }

      // --- Replace the audio track (optional but improves consistency) ---
      const audioTrack = combinedStream.getAudioTracks()[0];
      const replaceAudioInCall = (call: MediaConnection) => {
        const audioSender = call.peerConnection
          .getSenders()
          .find((s) => s.track?.kind === "audio");
        if (audioSender && audioTrack) audioSender.replaceTrack(audioTrack);
      };

      if (mode === "host") {
        hostCallsRef.current.forEach(replaceAudioInCall);
      } else if (joinerCallRef.current) {
        replaceAudioInCall(joinerCallRef.current);
      }

      // Update local preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = combinedStream;
      }

      // When user stops sharing manually (via browser prompt)
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  const stopScreenShare = async () => {
    if (!isSharingScreen || !localStreamRef.current) return;

    // Stop the screen stream
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setIsSharingScreen(false);

    // Restore camera tracks
    const cameraVideoTrack = localStreamRef.current.getVideoTracks()[0];
    const cameraAudioTrack = localStreamRef.current.getAudioTracks()[0];

    const restoreInCall = (call: MediaConnection) => {
      const senders = call.peerConnection.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === "video");
      if (videoSender && cameraVideoTrack) videoSender.replaceTrack(cameraVideoTrack);

      const audioSender = senders.find((s) => s.track?.kind === "audio");
      if (audioSender && cameraAudioTrack) audioSender.replaceTrack(cameraAudioTrack);
    };

    if (mode === "host") {
      hostCallsRef.current.forEach(restoreInCall);
    } else if (joinerCallRef.current) {
      restoreInCall(joinerCallRef.current);
    }

    // Restore local video preview
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoHidden(!videoTrack.enabled);
    }
  };

  const handleAssetsProgress = useCallback(
    (progress: { itemsLoaded: number; itemsTotal: number; ratio: number }) => {
      if (!Number.isFinite(progress.ratio)) return;
      setAssetsProgress(progress.ratio);
    },
    []
  );

  const handleAssetsLoaded = useCallback(() => {
    setAssetsProgress(1);
    setAssetsLoaded(true);
  }, []);

  const handleAssetsError = useCallback((error: unknown) => {
    console.error("Asset load error:", error);
    setAssetsLoaded(true);
  }, []);

  const toggleGyro = async () => {
    if (!isMobile) return;
    if (!gyroEnabled) {
      const maybePermission = (DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<"granted" | "denied">;
      }).requestPermission;
      if (maybePermission) {
        try {
          const response = await maybePermission();
          if (response !== "granted") return;
        } catch (error) {
          console.error("Gyro permission error:", error);
          return;
        }
      }
    }
    setGyroEnabled((prev) => !prev);
  };

  useEffect(() => {
    if (!mode) return;
    setAssetsLoaded(false);
    setAssetsProgress(0);
    setGyroEnabled(false);
  }, [mode]);



  // Step 1: Landing page
  if (!mode) {
  return (
        <div className="flex items-center justify-center h-screen bg-linear-to-b from-zinc-950 via-zinc-900 to-black">
          <div className="absolute inset-0 flex items-center justify-center text-white bg-black/55 backdrop-blur-xl">
            <div className="w-full max-w-5xl px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Mode picker */}
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
                  <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-linear-to-br from-emerald-400/25 to-cyan-500/10 blur-2xl" />
                  <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-linear-to-br from-rose-500/20 to-amber-400/10 blur-2xl" />

                  <div className="relative space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Vinema 3D
                    </div>

                    <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
                      Choose your role.
                    </h1>

                    <p className="text-base text-white/80">
                      Start a session as a host, or join instantly as a viewer.
                    </p>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={() => setMode("host")}
                        className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/15 active:scale-[0.99]"
                      >
                        I’m the Host
                      </button>

                      <button
                        onClick={() => setMode("join")}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/15 active:scale-[0.99]"
                      >
                        I’m a Viewer
                      </button>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                      <span className="h-2 w-2 rounded-full bg-cyan-300" />
                      Peer-to-peer sessions • no centralized streaming
                    </div>
                  </div>
                </div>

                {/* Right: Feature cards (same styling as your sample) */}
                <div className="grid grid-cols-1 gap-6 text-white/90">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-200">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M8 12h8M12 8v8" />
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold">PeerJS powered</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-white/70">
                      Vinema 3D connects hosts and viewers directly using <strong>PeerJS</strong>,
                      delivering real-time peer-to-peer streaming without centralized servers.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-400/15 text-rose-200">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold">Three.js immersion</h2>
                    </div>
                    <p className="text-sm leading-relaxed text-white/70">
                      Each session lives inside a 3D theater powered by <strong>Three.js</strong>,
                      creating a shared cinematic space.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}


  // Step 2: Main interface
  return (

    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {!assetsLoaded && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center text-white bg-black/55 backdrop-blur-xl">
          <div className="w-full max-w-xl px-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
              <div className="absolute -top-28 -left-24 h-56 w-56 rounded-full bg-linear-to-br from-cyan-400/25 to-blue-500/10 blur-2xl" />
              <div className="relative space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
                  <span className="h-2 w-2 rounded-full bg-cyan-300" />
                  Vinema 3D
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
                  Loading assets
                </h1>
                <p className="text-sm text-white/70">
                  Preparing the 3D cinema environment.
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-cyan-400 via-blue-400 to-indigo-400 transition-all"
                    style={{ width: `${progressBarWidth}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-2 animate-ping rounded-full bg-cyan-300/80" />
                    Optimizing shaders and streams
                  </span>
                  <span>{progressPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* === Floating action buttons (modern glass style) === */}
      <button
        onClick={() => {
          setControlsVisible(!controlsVisible);
          setMessagesVisible(false);
          setSeatOptionsVisible(false);
        }}
        className="group absolute top-6 right-6 z-50 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-3 text-white/90 shadow-2xl backdrop-blur-xl transition hover:bg-white/10 hover:border-white/15 active:scale-[0.99]"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition group-hover:ring-white/20">
          <Settings size={18} />
        </span>
        <span
          className={`text-sm font-medium tracking-wide transition-all ${
            controlsVisible ? "max-w-[120px] opacity-100 ml-1" : "max-w-0 opacity-0 ml-0"
          } overflow-hidden whitespace-nowrap`}
        >
          Settings
        </span>
      </button>

      <button
        onClick={() => {
          setMessagesVisible(!messagesVisible);
          setControlsVisible(false);
          setSeatOptionsVisible(false);
        }}
        className="group absolute top-20 right-6 z-50 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-3 text-white/90 shadow-2xl backdrop-blur-xl transition hover:bg-white/10 hover:border-white/15 active:scale-[0.99]"
      >
        <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition group-hover:ring-white/20">
          <MessageCircleMore size={18} />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex min-w-[18px] items-center justify-center rounded-full border border-white/15 bg-rose-500/80 px-1 text-[10px] font-semibold text-white shadow">
              {messages.length}
            </span>
          )}
        </span>

        <span
          className={`text-sm font-medium tracking-wide transition-all ${
            messagesVisible ? "max-w-[120px] opacity-100 ml-1" : "max-w-0 opacity-0 ml-0"
          } overflow-hidden whitespace-nowrap`}
        >
          Messages
        </span>
      </button>

      <button
        onClick={() => {
          setSeatOptionsVisible(!seatOptionsVisible);
          setControlsVisible(false);
          setMessagesVisible(false);
        }}
        className="group absolute top-[8.4rem] right-6 z-50 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-3 text-white/90 shadow-2xl backdrop-blur-xl transition hover:bg-white/10 hover:border-white/15 active:scale-[0.99]"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition group-hover:ring-white/20">
          <GalleryThumbnails size={18} />
        </span>
        <span
          className={`text-sm font-medium tracking-wide transition-all ${
            seatOptionsVisible ? "max-w-[120px] opacity-100 ml-1" : "max-w-0 opacity-0 ml-0"
          } overflow-hidden whitespace-nowrap`}
        >
          Seats
        </span>
      </button>

      {/* === Seat options panel === */}
      {seatOptionsVisible && (
        <div
          className="absolute top-[12.2rem] right-6 z-50 w-[22rem] max-w-[85vw] overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur-xl"
          style={{ width: `${seatPanelWidthRem}rem` }}
        >
          <div className="relative p-5">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-linear-to-br from-emerald-400/20 to-cyan-400/10 blur-2xl" />
            <div className="relative space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/80">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Seat selection
              </div>
              <p className="text-sm text-white/70">
                Choose your seat. This updates your starting camera position in the theater.
              </p>
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="lg:min-h-155 lg:max-h-155 max-h-50 min-h-50 overflow-y-auto space-y-4 pr-1">
              {SEAT_ROWS.map((row) => {
                const rowSeats = SEAT_OPTIONS.filter((seat) => seat.row === row.key);
                return (
                  <div key={row.key} className="space-y-2">
                    <div className="flex justify-center">
                      <div
                        className="grid gap-1.5"
                        style={{ gridTemplateColumns: `repeat(${rowSeats.length}, minmax(2.5rem, 2.5rem))` }}
                      >
                        {rowSeats.map((seat) => {
                          const isSelected = seat.id === selectedSeatId;
                          return (
                            <button
                              key={seat.id}
                              onClick={() => setSelectedSeatId(seat.id)}
                              title={`${seat.label} - ${seat.description}`}
                              className={`h-9 w-10 rounded-lg border text-xs font-semibold transition ${
                                isSelected
                                  ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-[0_0_0_3px_rgba(52,211,153,0.12)]"
                                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:border-white/15"
                              }`}
                            >
                              {seat.label.split(" ").pop()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* === Messages panel === */}
      {messagesVisible && (
        <div className="absolute top-[8.4rem] right-6 z-50 w-[26rem] max-w-[92vw] overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur-xl">
          <div className="relative p-5">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-linear-to-br from-rose-500/20 to-amber-400/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/80">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                Messages
              </div>
              <div className="text-xs text-white/50">{messages.length} total</div>
            </div>
          </div>

          <div className="px-5 pb-5 space-y-3">
            <div className="lg:min-h-155 lg:max-h-155 max-h-50 min-h-50 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
              {messages.map((msg, i) => (
                <div key={i} className={msg.sender === "You" ? "text-right" : "text-left"}>
                  <span
                    className={`inline-block max-w-[85%] px-3 py-2 rounded-2xl mt-2 text-sm border ${
                      msg.sender === "You"
                        ? "bg-emerald-400/15 border-emerald-400/20 text-emerald-100"
                        : "bg-white/10 border-white/10 text-white/90"
                    }`}
                  >
                    <span className="block text-[11px] mb-0.5 text-white/60">
                      {msg.sender}
                    </span>
                    {msg.text}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-emerald-400/30"
                placeholder="Type a message..."
              />
              <button
                onClick={sendMessage}
                className="rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 active:scale-[0.99]"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Controls panel === */}
      {controlsVisible && (
        <div className="absolute top-20 right-6 z-50 w-[26rem] max-w-[92vw] overflow-hidden rounded-3xl border border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur-xl">
          <div className="relative p-5">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-linear-to-br from-amber-400/20 to-red-500/10 blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/80">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Vinema 3D
                </div>
                <h2 className="mt-3 text-xl font-semibold">Session controls</h2>
              </div>

              <div className="flex items-center gap-2 text-sm text-white/60">
                <User size={16} />
                <span className="capitalize">{mode || "Generating..."}</span>
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 space-y-4">
            {mode === "host" ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/50">Your ID</div>
                    <div className="font-mono text-sm text-emerald-200 break-all">{peerId || "Generating..."}</div>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10"
                  >
                    {copied ? <span className="text-emerald-200">Copied</span> : <span className="inline-flex items-center gap-2"><Copy size={16} /> Copy</span>}
                  </button>
                </div>

                <div className="text-sm text-white/70">
                  Connected viewers: <span className="text-white font-semibold">{viewerConnCount}</span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-2 max-h-28 overflow-y-auto">
                  {connectedViewerIds.length === 0 ? (
                    <div className="text-xs text-white/50 text-center py-3">No viewers connected</div>
                  ) : (
                    connectedViewerIds.map((viewerId) => (
                      <div key={viewerId} className="flex items-center justify-between gap-2 py-1 px-2">
                        <span className="text-xs text-white/80 truncate">{viewerId}</span>
                        <button
                          onClick={() => disconnectViewer(viewerId)}
                          className="shrink-0 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-400/15"
                        >
                          Disconnect
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={remoteId}
                  onChange={(e) => setRemoteId(e.target.value)}
                  placeholder="Enter host ID"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-400/30"
                />
                <button
                  onClick={startCall}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15 active:scale-[0.99]"
                >
                  <Phone size={16} /> Connect
                </button>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={endCall}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/15 active:scale-[0.99]"
              >
                <XCircle size={18} /> End
              </button>

              <button
                onClick={toggleMute}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-[0.99]"
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                {isMuted ? "Unmute" : "Mute"}
              </button>

              <button
                onClick={toggleVideo}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-[0.99]"
              >
                {isVideoHidden ? <VideoOff size={18} /> : <Video size={18} />}
                {isVideoHidden ? "Show" : "Hide"}
              </button>

              {mode === "host" && (
                <button
                  onClick={toggleScreenShare}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-[0.99]"
                >
                  <ScreenShare size={18} />
                  {isSharingScreen ? "Stop Share" : "Share Screen"}
                </button>
              )}

              {isMobile && (
                <button
                  onClick={toggleGyro}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition active:scale-[0.99] ${
                    gyroEnabled
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                      : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {gyroEnabled ? "Gyro On" : "Enable Gyro"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === Video grid (modern cards) === */}
      <div className="grid sm:grid-cols-2 gap-4 absolute bottom-6 left-6 right-6 opacity-0">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <div className="px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60 border-b border-white/10">
            Local Video
          </div>
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full aspect-video bg-black/40 object-cover" />
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <div className="px-4 py-2 text-xs uppercase tracking-[0.18em] text-white/60 border-b border-white/10">
            Remote Video
          </div>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full aspect-video bg-black/40 object-cover" />
        </div>
      </div>

      {mode === 'host' && (
        <CinemaWrapper
          videoElement={localVideoRef.current as any}
          videoStream={localStreamRef.current as any}
          isHost={true}
          initialCameraPosition={selectedSeat.cameraPosition}
          enableGyro={gyroEnabled && isMobile}
          onAssetsLoaded={handleAssetsLoaded}
          onAssetsProgress={handleAssetsProgress}
          onAssetsError={handleAssetsError}
        />
      )}
      {mode === 'join' && (
        <CinemaWrapper
          videoElement={remoteVideoRef.current as any}
          videoStream={remoteStreamRef.current as any}
          isHost={false}
          initialCameraPosition={selectedSeat.cameraPosition}
          enableGyro={gyroEnabled && isMobile}
          onAssetsLoaded={handleAssetsLoaded}
          onAssetsProgress={handleAssetsProgress}
          onAssetsError={handleAssetsError}
        />
      )}
    </div>
  );
}
