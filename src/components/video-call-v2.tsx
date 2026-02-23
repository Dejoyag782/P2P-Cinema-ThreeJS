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
  const combinedScreenStreamRef = useRef<MediaStream | null>(null);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>("default");
  const [displayName, setDisplayName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [namePromptVisible, setNamePromptVisible] = useState(false);
  const [pendingMode, setPendingMode] = useState<null | "host" | "join">(null);
  const [copied, setCopied] = useState(false);
  const [messagesVisible, setMessagesVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [seatOptionsVisible, setSeatOptionsVisible] = useState(false);
  const [selectedSeatId, setSelectedSeatId] = useState("mid2-10");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hostAudioStreams, setHostAudioStreams] = useState<
    { id: string; stream: MediaStream }[]
  >([]);
  const [hostMutedViewerIds, setHostMutedViewerIds] = useState<Set<string>>(
    () => new Set()
  );
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
  const viewerCallsRef = useRef<Map<string, MediaConnection>>(new Map());
  const joinerCallRef = useRef<MediaConnection | null>(null);
  const joinerDataConnRef = useRef<DataConnection | null>(null);
  const [viewerAudioStreams, setViewerAudioStreams] = useState<
    { id: string; stream: MediaStream }[]
  >([]);
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

  const appendMessage = (sender: string, text: string) => {
    setMessages((prev) => [...prev, { sender, text }]);
  };

  const parseChatPayload = (data: unknown) => {
    if (typeof data === "string") {
      return { sender: "Guest", text: data, senderId: null as string | null };
    }
    if (data && typeof data === "object") {
      const maybe = data as { type?: string; sender?: string; text?: string; senderId?: string };
      if (maybe.type === "chat" && typeof maybe.text === "string") {
        return {
          sender: typeof maybe.sender === "string" && maybe.sender.trim() ? maybe.sender : "Guest",
          text: maybe.text,
          senderId: typeof maybe.senderId === "string" ? maybe.senderId : null,
        };
      }
    }
    return null;
  };

  const addViewerAudioStream = (viewerId: string, stream: MediaStream) => {
    setViewerAudioStreams((prev) => {
      const existing = prev.find((item) => item.id === viewerId);
      if (existing) {
        return prev.map((item) => (item.id === viewerId ? { id: viewerId, stream } : item));
      }
      return [...prev, { id: viewerId, stream }];
    });
  };

  const removeViewerAudioStream = (viewerId: string) => {
    setViewerAudioStreams((prev) => prev.filter((item) => item.id !== viewerId));
  };

  const shouldInitiateViewerCall = (otherId: string) => {
    const selfId = peerId || peer?.id;
    if (!selfId) return false;
    if (otherId === selfId) return false;
    // Deterministic rule to avoid double calls.
    return selfId > otherId;
  };

  const ensureViewerCall = async (otherId: string) => {
    if (!peer || mode !== "join") return;
    if (viewerCallsRef.current.has(otherId)) return;
    if (!shouldInitiateViewerCall(otherId)) return;
    try {
      const stream = await ensureLocalStream();
      const call = peer.call(otherId, stream);
      if (!call) return;
      viewerCallsRef.current.set(otherId, call);
      call.on("stream", (remoteStream) => {
        addViewerAudioStream(otherId, remoteStream);
      });
      call.on("close", () => {
        viewerCallsRef.current.delete(otherId);
        removeViewerAudioStream(otherId);
      });
      call.on("error", () => {
        viewerCallsRef.current.delete(otherId);
        removeViewerAudioStream(otherId);
      });
    } catch (error) {
      console.error("Viewer call failed:", error);
    }
  };

  const closeViewerCall = (otherId: string) => {
    const call = viewerCallsRef.current.get(otherId);
    if (call) {
      call.close();
      viewerCallsRef.current.delete(otherId);
    }
    removeViewerAudioStream(otherId);
  };

  const replaceCallTracks = (call: MediaConnection, stream: MediaStream | null) => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];
    const senders = call.peerConnection.getSenders();
    const videoSender = senders.find((s) => s.track?.kind === "video");
    if (videoSender && videoTrack) videoSender.replaceTrack(videoTrack);
    const audioSender = senders.find((s) => s.track?.kind === "audio");
    if (audioSender && audioTrack) audioSender.replaceTrack(audioTrack);
  };

  useEffect(() => {
    setIsMobile(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const refreshAudioInputs = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((device) => device.kind === "audioinput");
      setAudioInputDevices(inputs);
      if (!inputs.find((d) => d.deviceId === selectedMicId)) {
        setSelectedMicId(inputs[0]?.deviceId ?? "default");
      }
    } catch (error) {
      console.error("Failed to enumerate devices:", error);
    }
  };

  useEffect(() => {
    refreshAudioInputs();
    navigator.mediaDevices.addEventListener("devicechange", refreshAudioInputs);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", refreshAudioInputs);
    };
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

  const removeHostAudioStream = (viewerId: string) => {
    setHostAudioStreams((prev) => prev.filter((item) => item.id !== viewerId));
  };

  const toggleHostViewerMute = (viewerId: string) => {
    setHostMutedViewerIds((prev) => {
      const next = new Set(prev);
      if (next.has(viewerId)) next.delete(viewerId);
      else next.add(viewerId);
      return next;
    });
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

    removeHostAudioStream(viewerId);
    syncHostViewerState();
  };

  const ensureLocalStream = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  };

  const replaceOutgoingAudioTrack = (newTrack: MediaStreamTrack | null) => {
    if (!newTrack) return;
    const replaceInCall = (call: MediaConnection) => {
      const sender = call.peerConnection.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) sender.replaceTrack(newTrack);
    };
    hostCallsRef.current.forEach(replaceInCall);
    viewerCallsRef.current.forEach(replaceInCall);
    if (joinerCallRef.current) replaceInCall(joinerCallRef.current);
  };

  const handleMicChange = async (deviceId: string) => {
    setSelectedMicId(deviceId);
    if (!localStreamRef.current) return;
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      const newTrack = micStream.getAudioTracks()[0];
      if (!newTrack) return;

      const oldTrack = localStreamRef.current.getAudioTracks()[0];
      if (oldTrack) localStreamRef.current.removeTrack(oldTrack);
      localStreamRef.current.addTrack(newTrack);
      oldTrack?.stop();

      replaceOutgoingAudioTrack(newTrack);
    } catch (error) {
      console.error("Failed to switch microphone:", error);
    }
  };

  const closeAllConnections = () => {
    hostCallsRef.current.forEach((call) => call.close());
    hostCallsRef.current.clear();

    hostDataConnsRef.current.forEach((conn) => conn.close());
    hostDataConnsRef.current.clear();

    viewerCallsRef.current.forEach((call) => call.close());
    viewerCallsRef.current.clear();

    joinerCallRef.current?.close();
    joinerCallRef.current = null;

    joinerDataConnRef.current?.close();
    joinerDataConnRef.current = null;

    setViewerConnCount(0);
    setConnectedViewerIds([]);
    setHostAudioStreams([]);
    setHostMutedViewerIds(new Set());
    setViewerAudioStreams([]);
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
      if (mode === "host") {
        try {
        const stream = await ensureLocalStream();
        call.answer(stream);
        hostCallsRef.current.set(call.peer, call);
        syncHostViewerState();
        if (isSharingScreen && combinedScreenStreamRef.current) {
          replaceCallTracks(call, combinedScreenStreamRef.current);
        }

          call.on("stream", (remoteStream) => {
            setHostAudioStreams((prev) => {
              const existing = prev.find((item) => item.id === call.peer);
              if (existing) {
                return prev.map((item) =>
                  item.id === call.peer ? { id: call.peer, stream: remoteStream } : item
                );
              }
              return [...prev, { id: call.peer, stream: remoteStream }];
            });
          });

          call.on("close", () => {
            hostCallsRef.current.delete(call.peer);
            removeHostAudioStream(call.peer);
            syncHostViewerState();
          });

          call.on("error", () => {
            hostCallsRef.current.delete(call.peer);
            removeHostAudioStream(call.peer);
            syncHostViewerState();
          });
        } catch (error) {
          console.error("Failed to answer incoming call:", error);
        }
        return;
      }

      if (mode === "join") {
        try {
          const stream = await ensureLocalStream();
          call.answer(stream);
          viewerCallsRef.current.set(call.peer, call);

          call.on("stream", (remoteStream) => {
            addViewerAudioStream(call.peer, remoteStream);
          });

          call.on("close", () => {
            viewerCallsRef.current.delete(call.peer);
            removeViewerAudioStream(call.peer);
          });

          call.on("error", () => {
            viewerCallsRef.current.delete(call.peer);
            removeViewerAudioStream(call.peer);
          });
        } catch (error) {
          console.error("Failed to answer viewer call:", error);
        }
      }
    });

    // Chat connections: host stores many, joiner stores one.
    p.on("connection", (conn) => {
      if (mode === "host") {
        hostDataConnsRef.current.set(conn.peer, conn);
        syncHostViewerState();
        conn.on("open", () => {
          const viewerIds = Array.from(hostDataConnsRef.current.keys()).filter(
            (id) => id !== conn.peer
          );
          if (conn.open) {
            conn.send({ type: "peer-list", peers: viewerIds });
          }
          hostDataConnsRef.current.forEach((otherConn) => {
            if (otherConn.open && otherConn.peer !== conn.peer) {
              otherConn.send({ type: "peer-joined", peerId: conn.peer });
            }
          });
        });
        conn.on("data", (data) => {
          const chat = parseChatPayload(data);
          if (!chat) return;
          appendMessage(chat.sender || conn.peer, chat.text);

          // Relay viewer messages to all connected viewers (including sender for consistency)
          hostDataConnsRef.current.forEach((otherConn) => {
            if (otherConn.open && otherConn.peer !== conn.peer) {
              otherConn.send({
                type: "chat",
                sender: chat.sender || conn.peer,
                text: chat.text,
                senderId: chat.senderId ?? conn.peer,
              });
            }
          });
        });
        conn.on("close", () => {
          hostDataConnsRef.current.delete(conn.peer);
          syncHostViewerState();
          hostDataConnsRef.current.forEach((otherConn) => {
            if (otherConn.open) {
              otherConn.send({ type: "peer-left", peerId: conn.peer });
            }
          });
        });
        conn.on("error", () => {
          hostDataConnsRef.current.delete(conn.peer);
          syncHostViewerState();
          hostDataConnsRef.current.forEach((otherConn) => {
            if (otherConn.open) {
              otherConn.send({ type: "peer-left", peerId: conn.peer });
            }
          });
        });
      } else {
        joinerDataConnRef.current = conn;
        conn.on("data", (data) => {
          if (data && typeof data === "object") {
            const maybe = data as { type?: string; peers?: string[]; peerId?: string };
            if (maybe.type === "peer-list" && Array.isArray(maybe.peers)) {
              maybe.peers.forEach((id) => ensureViewerCall(id));
              return;
            }
            if (maybe.type === "peer-joined" && typeof maybe.peerId === "string") {
              ensureViewerCall(maybe.peerId);
              return;
            }
            if (maybe.type === "peer-left" && typeof maybe.peerId === "string") {
              closeViewerCall(maybe.peerId);
              return;
            }
          }
          const chat = parseChatPayload(data);
          if (!chat) return;
          if (chat.senderId && chat.senderId === peerId) return;
          appendMessage(chat.sender, chat.text);
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
      if (data && typeof data === "object") {
        const maybe = data as { type?: string; peers?: string[]; peerId?: string };
        if (maybe.type === "peer-list" && Array.isArray(maybe.peers)) {
          maybe.peers.forEach((id) => ensureViewerCall(id));
          return;
        }
        if (maybe.type === "peer-joined" && typeof maybe.peerId === "string") {
          ensureViewerCall(maybe.peerId);
          return;
        }
        if (maybe.type === "peer-left" && typeof maybe.peerId === "string") {
          closeViewerCall(maybe.peerId);
          return;
        }
      }
      const chat = parseChatPayload(data);
      if (!chat) return;
      if (chat.senderId && chat.senderId === peerId) return;
      appendMessage(chat.sender, chat.text);
    });
    conn.on("close", () => {
      joinerDataConnRef.current = null;
    });
  };

  const endCall = () => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setIsSharingScreen(false);

    viewerCallsRef.current.forEach((call) => call.close());
    viewerCallsRef.current.clear();
    setViewerAudioStreams([]);

    closeAllConnections();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setMessages([]);
    setDisplayName("");
    setNameInput("");
    setMode(null);
  };

  const sendMessage = () => {
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    if (mode === "host") {
      hostDataConnsRef.current.forEach((conn) => {
        if (conn.open) conn.send({ type: "chat", sender: localSenderName, text: trimmed, senderId: localSenderId });
      });
      appendMessage(localSenderName, trimmed);
    } else {
      const conn = joinerDataConnRef.current;
      if (!conn?.open) return;
      conn.send({ type: "chat", sender: localSenderName, text: trimmed, senderId: localSenderId });
      appendMessage(localSenderName, trimmed);
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
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
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
      combinedScreenStreamRef.current = combinedStream;
      setIsSharingScreen(true);

      if (mode === "host") {
        hostCallsRef.current.forEach((call) => replaceCallTracks(call, combinedStream));
      } else if (joinerCallRef.current) {
        replaceCallTracks(joinerCallRef.current, combinedStream);
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
    combinedScreenStreamRef.current = null;
    setIsSharingScreen(false);

    // Restore camera tracks
    const cameraVideoTrack = localStreamRef.current.getVideoTracks()[0];
    const cameraAudioTrack = localStreamRef.current.getAudioTracks()[0];

    if (mode === "host") {
      hostCallsRef.current.forEach((call) =>
        replaceCallTracks(call, localStreamRef.current)
      );
    } else if (joinerCallRef.current) {
      replaceCallTracks(joinerCallRef.current, localStreamRef.current);
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
    setGyroEnabled(false);
  }, [mode]);

  const openNamePrompt = (nextMode: "host" | "join") => {
    setPendingMode(nextMode);
    setNameInput(displayName);
    setNamePromptVisible(true);
  };

  const confirmNamePrompt = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setDisplayName(trimmed);
    setNamePromptVisible(false);
    if (pendingMode) {
      setMode(pendingMode);
      setPendingMode(null);
    }
  };

  const cancelNamePrompt = () => {
    setNamePromptVisible(false);
    setPendingMode(null);
  };

  const localSenderName = displayName || (mode === "host" ? "Host" : "Guest");
  const localSenderId = peerId || peer?.id || "";



  const showLanding = !mode;



  // Step 2: Main interface
  return (

    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <div
        className={`absolute inset-0 z-[70] flex items-center justify-center bg-linear-to-b from-zinc-950/90 via-zinc-900/85 to-black/90 text-white transition-opacity duration-500 ease-out ${
          showLanding ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-black/55 backdrop-blur-xl" />
        <div className="relative w-full max-w-5xl px-6">
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
                    onClick={() => openNamePrompt("host")}
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/15 active:scale-[0.99]"
                  >
                    I'm the Host
                  </button>

                  <button
                    onClick={() => openNamePrompt("join")}
                    className="inline-flex items-center justify-center rounded-xl border border-rose-400/30 bg-rose-400/10 px-5 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/15 active:scale-[0.99]"
                  >
                    I'm a Viewer
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
      {namePromptVisible && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-linear-to-b from-white/10 to-white/5 text-white shadow-2xl">
            <div className="p-6 space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/80">
                Choose a name
              </div>
              <h2 className="text-2xl font-semibold">Display name</h2>
              <p className="text-sm text-white/70">
                This name will appear in chat for everyone in the session.
              </p>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmNamePrompt()}
                placeholder="Enter your name"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-emerald-400/30"
              />
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={confirmNamePrompt}
                  className="flex-1 rounded-2xl border border-emerald-400/30 bg-emerald-400/15 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 active:scale-[0.99]"
                >
                  Continue
                </button>
                <button
                  onClick={cancelNamePrompt}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-[0.99]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {mode && !assetsLoaded && (
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
      {mode && (
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
      )}

      {mode && (
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
      )}

      {mode && (
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
      )}

      {/* === Seat options panel === */}
      {mode && seatOptionsVisible && (
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
      {mode && messagesVisible && (
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
                <div key={i} className={msg.sender === localSenderName ? "text-right" : "text-left"}>
                  <span
                    className={`inline-block max-w-[85%] px-3 py-2 rounded-2xl mt-2 text-sm border ${
                      msg.sender === localSenderName
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
      {mode && controlsVisible && (
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
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleHostViewerMute(viewerId)}
                            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/80 transition hover:bg-white/10"
                          >
                            {hostMutedViewerIds.has(viewerId) ? "Unmute" : "Mute"}
                          </button>
                          <button
                            onClick={() => disconnectViewer(viewerId)}
                            className="shrink-0 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-400/15"
                          >
                            Disconnect
                          </button>
                        </div>
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

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-white/50 mb-2">
                Microphone
              </div>
              <select
                value={selectedMicId}
                onChange={(e) => handleMicChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-400/30"
              >
                {audioInputDevices.length === 0 && (
                  <option value="default">Default microphone</option>
                )}
                {audioInputDevices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${index + 1}`}
                  </option>
                ))}
              </select>
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

      <CinemaWrapper
        videoElement={
          mode === "host"
            ? (localVideoRef.current as any)
            : mode === "join"
            ? (remoteVideoRef.current as any)
            : null
        }
        videoStream={
          mode === "host"
            ? ((isSharingScreen ? combinedScreenStreamRef.current : localStreamRef.current) as any)
            : mode === "join"
            ? (remoteStreamRef.current as any)
            : null
        }
        isHost={mode === "host"}
        initialCameraPosition={selectedSeat.cameraPosition}
        enableGyro={mode ? gyroEnabled && isMobile : false}
        onAssetsLoaded={handleAssetsLoaded}
        onAssetsProgress={handleAssetsProgress}
        onAssetsError={handleAssetsError}
      />

      {mode === "host" && (
        <div className="hidden">
          {hostAudioStreams.map((item) => (
            <audio
              key={item.id}
              autoPlay
              playsInline
              muted={hostMutedViewerIds.has(item.id)}
              ref={(el) => {
                if (el && el.srcObject !== item.stream) {
                  el.srcObject = item.stream;
                }
              }}
            />
          ))}
        </div>
      )}

      {mode === "join" && (
        <div className="hidden">
          {viewerAudioStreams.map((item) => (
            <audio
              key={item.id}
              autoPlay
              playsInline
              ref={(el) => {
                if (el && el.srcObject !== item.stream) {
                  el.srcObject = item.stream;
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
