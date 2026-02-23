import { useCallback, useEffect, useRef, useState } from "react";
import Peer, { MediaConnection, DataConnection } from "peerjs";
import CinemaWrapper from "./cinema/CinemaWrapper";
import AudioStreamList from "./video-call/AudioStreamList";
import ControlsPanel from "./video-call/ControlsPanel";
import FloatingActionButtons from "./video-call/FloatingActionButtons";
import LandingOverlay from "./video-call/LandingOverlay";
import LoadingOverlay from "./video-call/LoadingOverlay";
import MessagesPanel from "./video-call/MessagesPanel";
import NamePromptModal from "./video-call/NamePromptModal";
import SeatOptionsPanel from "./video-call/SeatOptionsPanel";
import { SEAT_OPTIONS, SEAT_ROWS } from "./video-call/seat-data";
import type { ChatMessage } from "./video-call/types";

export default function VideoCall() {
  const [mode, setMode] = useState<null | "host" | "join">(null);
  const [peerId, setPeerId] = useState("");
  const [remoteId, setRemoteId] = useState("");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
      <LandingOverlay visible={showLanding} onOpenNamePrompt={openNamePrompt} />
      <NamePromptModal
        visible={namePromptVisible}
        nameInput={nameInput}
        onNameInputChange={setNameInput}
        onConfirm={confirmNamePrompt}
        onCancel={cancelNamePrompt}
      />
      <LoadingOverlay
        visible={Boolean(mode && !assetsLoaded)}
        progressBarWidth={progressBarWidth}
        progressPercent={progressPercent}
      />
      <FloatingActionButtons
        visible={Boolean(mode)}
        controlsVisible={controlsVisible}
        messagesVisible={messagesVisible}
        seatOptionsVisible={seatOptionsVisible}
        messagesCount={messages.length}
        onToggleControls={() => {
          setControlsVisible(!controlsVisible);
          setMessagesVisible(false);
          setSeatOptionsVisible(false);
        }}
        onToggleMessages={() => {
          setMessagesVisible(!messagesVisible);
          setControlsVisible(false);
          setSeatOptionsVisible(false);
        }}
        onToggleSeatOptions={() => {
          setSeatOptionsVisible(!seatOptionsVisible);
          setControlsVisible(false);
          setMessagesVisible(false);
        }}
      />

      <SeatOptionsPanel
        visible={Boolean(mode && seatOptionsVisible)}
        seatPanelWidthRem={seatPanelWidthRem}
        selectedSeatId={selectedSeatId}
        onSelectSeat={setSelectedSeatId}
      />

      <MessagesPanel
        visible={Boolean(mode && messagesVisible)}
        messages={messages}
        inputMessage={inputMessage}
        onInputChange={setInputMessage}
        onSend={sendMessage}
        localSenderName={localSenderName}
      />

      {mode && (
        <ControlsPanel
          visible={controlsVisible}
          mode={mode as "host" | "join"}
          peerId={peerId}
          copied={copied}
          viewerConnCount={viewerConnCount}
          connectedViewerIds={connectedViewerIds}
          hostMutedViewerIds={hostMutedViewerIds}
          remoteId={remoteId}
          isMuted={isMuted}
          isVideoHidden={isVideoHidden}
          isSharingScreen={isSharingScreen}
          isMobile={isMobile}
          gyroEnabled={gyroEnabled}
          audioInputDevices={audioInputDevices}
          selectedMicId={selectedMicId}
          onCopyToClipboard={copyToClipboard}
          onToggleHostViewerMute={toggleHostViewerMute}
          onDisconnectViewer={disconnectViewer}
          onRemoteIdChange={setRemoteId}
          onStartCall={startCall}
          onEndCall={endCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onToggleGyro={toggleGyro}
          onMicChange={handleMicChange}
        />
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
        <AudioStreamList streams={hostAudioStreams} mutedIds={hostMutedViewerIds} />
      )}

      {mode === "join" && <AudioStreamList streams={viewerAudioStreams} />}
    </div>
  );
}



