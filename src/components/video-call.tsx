import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { Video, VideoOff, Mic, MicOff, ScreenShare, XCircle, Phone, Copy, User } from 'lucide-react';
import CinemaWrapper from './cinema/CinemaWrapper';

const VideoCall = () => {
  const [role, setRole] = useState<'host' | 'viewer' | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [remotePeerId, setRemotePeerId] = useState('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [call, setCall] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoHidden, setIsVideoHidden] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

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
    if (!call) return;
    const handleClose = () => endCall();
    call.on('close', handleClose);
    return () => call.off?.('close', handleClose);
  }, [call]);

  useEffect(() => {
    if (!role) return;

    const newPeer = new Peer();
    newPeer.on('open', id => setPeerId(id as string));

    newPeer.on('call', incomingCall => {
      if (role === 'viewer') return; // viewer shouldn't receive calls

      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then(stream => {
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          incomingCall.answer(stream);
          incomingCall.on('stream', remoteStream => {
            remoteStreamRef.current = remoteStream;
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          });
          setCall(incomingCall);
        });
    });

    newPeer.on('disconnected', () => {
      newPeer.reconnect();
      endCall();
    });

    newPeer.on('close', () => {
      endCall();
      setPeer(null);
      setPeerId(null);
    });

    setPeer(newPeer);

    const handleUnload = () => {
      endCall();
      newPeer.destroy();
      setPeer(null);
      setPeerId(null);
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      newPeer.destroy();
    };
  }, [role]);

  const callPeer = () => {
    if (!peer || !remotePeerId) return;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        const outgoingCall = peer.call(remotePeerId, stream);
        outgoingCall.on('stream', remoteStream => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        });
        setCall(outgoingCall);
      });
  };

  const endCall = () => {
    call?.close();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setCall(null);
    setIsMuted(false);
    setIsVideoHidden(false);
    setIsScreenSharing(false);
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

  const toggleScreenShare = async () => {
    if (isScreenSharing) stopScreenShare();
    else startScreenShare();
  };

  const startScreenShare = async () => {
    if (!call) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      if (screenStream.getAudioTracks().length > 0) {
        const screenAudio = audioContext.createMediaStreamSource(screenStream);
        screenAudio.connect(destination);
      }

      if (micStream.getAudioTracks().length > 0) {
        const micAudio = audioContext.createMediaStreamSource(micStream);
        micAudio.connect(destination);
      }

      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      screenStreamRef.current = combinedStream;

      const sender = call.peerConnection.getSenders().find((s: any) => s.track.kind === 'video');
      if (sender) sender.replaceTrack(combinedStream.getVideoTracks()[0]);

      const audioSender = call.peerConnection.getSenders().find((s: any) => s.track.kind === 'audio');
      if (audioSender && combinedStream.getAudioTracks().length > 0)
        audioSender.replaceTrack(combinedStream.getAudioTracks()[0]);

      if (localVideoRef.current) localVideoRef.current.srcObject = combinedStream;
      screenStream.getVideoTracks()[0].onended = () => stopScreenShare();

      setIsScreenSharing(true);
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = () => {
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    const sender = call?.peerConnection.getSenders().find((s: any) => s.track.kind === 'video');
    if (sender && localStreamRef.current) {
      sender.replaceTrack(localStreamRef.current.getVideoTracks()[0]);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    }
    setIsScreenSharing(false);
  };

  if (!role) {
    return (
     <div className="relative w-screen h-screen bg-black overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/70 backdrop-blur-lg space-y-6 z-50">
          <div className="grid grid-cols-2 gap-6 max-w-250 items-center justify-center">
            <div className="flex bg-white/20 backdrop-blur-lg h-full rounded-2xl p-6 flex-col items-center justify-center space-y-6">
              <h1 className="text-5xl font-bold">🎥 Vinema 3D</h1>
              <p className="text-2xl">Are you a Host or Viewer?</p>
              <div className="flex space-x-4">
                <button onClick={() => setRole("host")} className="px-6 py-3 bg-blue-600 rounded-xl text-xl">
                  I’m the Host
                </button>
                <button onClick={() => setRole("viewer")} className="px-6 py-3 bg-green-600 rounded-xl text-xl">
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

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <button
        onClick={() => setControlsVisible(!controlsVisible)}
        className="absolute top-6 right-6 z-50 bg-gray-900/70 text-white rounded-full p-3 shadow-lg"
      >
        ⚙️
      </button>
      {controlsVisible && (
      <div className="absolute top-20 right-6 bg-gray-900/85 text-white rounded-2xl p-5 w-100 space-y-4 shadow-lg z-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">🎥 Vinema 3D</h2>
          <div className="flex items-center gap-2 text-sm">
            <User size={16} />
            <span className="capitalize text-gray-400">{role}</span>
          </div>
        </div>

        {role === 'host' ? (
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
              value={remotePeerId}
              onChange={e => setRemotePeerId(e.target.value)}
              placeholder="Enter host ID"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={callPeer}
              className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg text-white flex items-center gap-2"
            >
              <Phone size={16} /> Connect
            </button>
          </div>
        )}

        {call && (
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
            {role === 'host' && (
              <button onClick={toggleScreenShare} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2">
                <ScreenShare size={18} />
                {isScreenSharing ? 'Stop Share' : 'Share Screen'}
              </button>
            )}
          </div>
        )}

        
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

      {role === 'host' && (
        <CinemaWrapper
          key={1}          
          videoElement={localVideoRef.current as any}
          videoStream={localStreamRef.current as any}
        />
      )}
      {role === 'viewer' && (
        <CinemaWrapper
          key={0}
          videoElement={remoteVideoRef.current as any}
          videoStream={remoteStreamRef.current as any}
        />
      )}
    </div>
  );
};

export default VideoCall;
