import { useEffect, useRef, useState } from "react";
import Peer, { MediaConnection, DataConnection } from "peerjs";
import CinemaWrapper from "./cinema/CinemaWrapper";
import { Copy, GalleryThumbnails, MessageCircleMore, Mic, MicOff, Phone, ScreenShare, Settings, User, Video, VideoOff, XCircle } from "lucide-react";

export default function VideoCall() {
  const [mode, setMode] = useState<null | "host" | "join">(null);
  const [peerId, setPeerId] = useState("");
  const [remoteId, setRemoteId] = useState("");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [dataConn, setDataConn] = useState<DataConnection | null>(null);
//   const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoHidden, setIsVideoHidden] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [copied, setCopied] = useState(false);
  const [messagesVisible, setMessagesVisible] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [seatOptionsVisible, setSeatOptionsVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

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

  // Host mode: initialize peer and listen for connections
  useEffect(() => {
    if (mode === "host") {
      const p = new Peer();
      setPeer(p);

      p.on("open", (id) => setPeerId(id));

      // Handle incoming call
      p.on("call", (call) => {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((stream) => {
            call.answer(stream);
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            call.on("stream", (remoteStream) => {
              if (remoteVideoRef.current){ 
                remoteVideoRef.current.srcObject = remoteStream;
                remoteStreamRef.current = remoteStream;
              };
            });

            callRef.current = call;
          })
          .catch(console.error);
      });

      // Handle incoming chat connection
      p.on("connection", (conn) => {
        setDataConn(conn);
        conn.on("data", (data) => {
          setMessages((prev) => [...prev, { sender: "Them", text: String(data) }]);
        });
      });

      return () => p.destroy();
    }
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
        });

        callRef.current = call;
        // setIsCalling(true);
      })
      .catch(console.error);

    const conn = peer.connect(remoteId);
    conn.on("open", () => {
      setDataConn(conn);
    });
    conn.on("data", (data) => {
      setMessages((prev) => [...prev, { sender: "Them", text: String(data) }]);
    });
  };

  const endCall = () => {
    if (callRef.current) {
      callRef.current.close();
      callRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    if (dataConn) {
      dataConn.close();
      setDataConn(null);
    }
    setMessages([]);
    setMode(null);
  };

  const sendMessage = () => {
    if (inputMessage.trim() && dataConn) {
      dataConn.send(inputMessage);
      setMessages((prev) => [...prev, { sender: "You", text: inputMessage }]);
      setInputMessage("");
    }
  };

  const toggleScreenShare = async () => {
    if (isSharingScreen) stopScreenShare();
    else startScreenShare();
  };

  const startScreenShare = async () => {
    try {
      if (!callRef.current) {
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
      const sender = callRef.current.peerConnection
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender && videoTrack) sender.replaceTrack(videoTrack);

      // --- Replace the audio track (optional but improves consistency) ---
      const audioTrack = combinedStream.getAudioTracks()[0];
      const audioSender = callRef.current.peerConnection
        .getSenders()
        .find((s) => s.track?.kind === "audio");
      if (audioSender && audioTrack) audioSender.replaceTrack(audioTrack);

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
    if (!isSharingScreen || !localStreamRef.current || !callRef.current) return;

    // Stop the screen stream
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setIsSharingScreen(false);

    // Restore camera tracks
    const cameraVideoTrack = localStreamRef.current.getVideoTracks()[0];
    const cameraAudioTrack = localStreamRef.current.getAudioTracks()[0];

    const senders = callRef.current.peerConnection.getSenders();

    const videoSender = senders.find((s) => s.track?.kind === "video");
    if (videoSender && cameraVideoTrack) videoSender.replaceTrack(cameraVideoTrack);

    const audioSender = senders.find((s) => s.track?.kind === "audio");
    if (audioSender && cameraAudioTrack) audioSender.replaceTrack(cameraAudioTrack);

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



  // Step 1: Landing page
  if (!mode) {
  return (
         <div className="relative w-screen h-screen bg-black overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/70 backdrop-blur-lg space-y-6 z-50">
              <div className="grid grid-cols-2 gap-6 max-w-250 items-center justify-center">
                <div className="flex bg-white/20 backdrop-blur-lg h-full rounded-2xl p-6 flex-col items-center justify-center space-y-6">
                  <h1 className="text-5xl font-bold">🎥 Vinema 3D</h1>
                  <p className="text-2xl">Are you a Host or Viewer?</p>
                  <div className="flex space-x-4">
                    <button onClick={() => setMode("host")} className="px-6 py-3 bg-blue-600 rounded-xl text-xl">
                      I’m the Host
                    </button>
                    <button 
                        onClick={() => {
                        const p = new Peer();
                        setPeer(p);
                        p.on("open", () => setMode("join"));
                        }} className="px-6 py-3 bg-green-600 rounded-xl text-xl"
                        // disabled={!remoteId.trim()}
                    >
                      I’m a Viewer
                    </button>
                  </div>
                </div>
    
                <div className="grid grid-cols-1 gap-6 text-white/90 h-full">
                  <div className="bg-white/20 p-4 rounded-xl backdrop-blur-md">
                    <h2 className="text-xl font-semibold mb-2">🌐 Powered by PeerJS</h2>
                    <p className="text-sm leading-relaxed">
                      Vinema 3D connects hosts and viewers directly using <strong>PeerJS</strong>, 
                      enabling real-time, peer-to-peer video streaming without centralized servers.
                    </p>
                  </div>
                  <div className="bg-white/20 p-4 rounded-xl backdrop-blur-md">
                    <h2 className="text-xl font-semibold mb-2">🎬 Immersive with Three.js</h2>
                    <p className="text-sm leading-relaxed">
                      Each viewing session takes place inside a 3D virtual environment — a digital theater powered by <strong>Three.js</strong>.
                    </p>
                  </div>
                </div>
              </div>
          </div>
          <CinemaWrapper/>
          </div>
  );
}


  // Step 2: Main interface
  return (

    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <button
        onClick={() => {setControlsVisible(!controlsVisible); setMessagesVisible(false); setSeatOptionsVisible(false)}}
        className="absolute top-6 right-6 z-50 bg-gray-900/70 text-white rounded-full p-3 shadow-lg"
      >
         <div className="flex items-center">
          <span role="img" aria-label="speech bubble"><Settings size={20}/></span>
          <span className={controlsVisible ? "block ml-2" : "hidden"}>Settings</span>
        </div>
      </button>

      <button
        onClick={() => {setMessagesVisible(!messagesVisible); setControlsVisible(false); setSeatOptionsVisible(false)}}
        className="absolute top-20 right-6 z-50 bg-gray-900/70 text-white rounded-full p-3 shadow-lg"
      >
        <div className="flex items-center">
          <span role="img" aria-label="speech bubble"><MessageCircleMore size={20}/><div className="fixed top-21 right-6 bg-red-500 rounded-full px-1 text-xs">{messages.length}</div></span>
          <span className={messagesVisible ? "block ml-2" : "hidden"}>Messages</span>
        </div>
      </button>

      
      <button
        onClick={() => {setSeatOptionsVisible(!seatOptionsVisible); setControlsVisible(false); setMessagesVisible(false)}}
        className="absolute top-33.5 right-6 z-50 bg-gray-900/70 text-white rounded-full p-3 shadow-lg"
      >
        <div className="flex items-center">
          <span role="img" aria-label="speech bubble" title="Seat Movement"><GalleryThumbnails size={20}/></span>
          <span className={seatOptionsVisible ? "block ml-2" : "hidden"}>Seats</span>
        </div>
      </button>

      {seatOptionsVisible && (
        <div className="absolute top-49 right-6 bg-gray-900/85 text-white rounded-2xl p-5 w-100 space-y-4 shadow-lg z-50">
            <div
            className="lg:min-h-155 lg:max-h-155 max-h-50 min-h-50 overflow-y-hidden p-2 rounded mb-2"
            >
                Currently Under Development
            </div>
        </div>
      )}

      {messagesVisible && (
        <div className="absolute top-35 right-6 bg-gray-900/85 text-white rounded-2xl p-5 w-100 space-y-4 shadow-lg z-50">
            <div
            className="lg:min-h-155 lg:max-h-155 max-h-50 min-h-50 overflow-y-hidden border border-gray-300 p-2 rounded mb-2"
            >
            {messages.map((msg, i) => (
                <div key={i} className={msg.sender === "You" ? "text-right" : "text-left"}>
                <span
                    className={`inline-block px-2 py-1 rounded mt-3 ${
                    msg.sender === "You" ? "bg-teal-300/70" : "bg-gray-200/70"
                    }`}
                >
                    <strong>{msg.sender}: </strong>
                    {msg.text}
                </span>
                </div>
            ))}
            {/* 👇 This ensures scroll target is always at the bottom */}
            <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
            <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 p-2 border border-gray-300 rounded"
                placeholder="Type a message..."
            />
            <button
                onClick={sendMessage}
                className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-400"
            >
                Send
            </button>
            </div>
        </div>
      )}

      {controlsVisible && (
      <div className="absolute top-20 right-6 bg-gray-900/85 text-white rounded-2xl p-5 w-100 space-y-4 shadow-lg z-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">🎥 Vinema 3D</h2>
          <div className="flex items-center gap-2 text-sm">
            <User size={16} />
            <span className="capitalize text-gray-400">{mode || 'Generating...'}</span>
          </div>
        </div>

        {mode === 'host' ? (
          <div className="flex items-center justify-center bg-gray-800 p-3 rounded-lg mb-6">
            <span className="text-sm text-gray-300 mr-2">Your ID:</span>
            <span className="font-mono text-green-400 break-all">{peerId || 'Generating...'}</span>
            <button onClick={copyToClipboard} className="ml-3 p-1.5 hover:bg-gray-700 rounded-md">
              {copied ? <span className="text-green-400 text-xs">Copied!</span> : <Copy size={18} />}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-2 mb-6">
            <input
              type="text"
              value={remoteId}
              onChange={e => setRemoteId(e.target.value)}
              placeholder="Enter host ID"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={startCall}
              className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg text-white flex items-center gap-2"
            >
              <Phone size={16} /> Connect
            </button>
          </div>
        )}

        {/* {callRef.current && ( */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <button onClick={endCall} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center gap-2">
              <XCircle size={18} /> End
            </button>
            <button onClick={toggleMute} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2">
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            <button onClick={toggleVideo} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2">
              {isVideoHidden ? <VideoOff size={18} /> : <Video size={18} />}
              {isVideoHidden ? 'Show' : 'Hide'}
            </button>

            {/* Host-only screen share */}
            {mode === 'host' && (
              <button onClick={toggleScreenShare} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2">
                <ScreenShare size={18} />
                {isSharingScreen ? 'Stop Share' : 'Share Screen'}
              </button>
            )}
          </div>
        {/* )} */}

        
      </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 absolute bottom-0">
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <h3 className="text-center text-gray-400 py-2 text-sm">Local Video</h3>
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full aspect-video bg-black object-cover" />
        </div>
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <h3 className="text-center text-gray-400 py-2 text-sm">Remote Video</h3>
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full aspect-video bg-black object-cover" />
        </div>
      </div>

      {mode === 'host' && (
        <CinemaWrapper
          key={1}          
          videoElement={localVideoRef.current as any}
          videoStream={localStreamRef.current as any}
        />
      )}
      {mode === 'join' && (
        <CinemaWrapper
          key={0}
          videoElement={remoteVideoRef.current as any}
          videoStream={remoteStreamRef.current as any}
        />
      )}
    </div>
  );
}