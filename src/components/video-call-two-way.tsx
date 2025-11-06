import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { Video, VideoOff, Mic, MicOff, ScreenShare, XCircle, Phone, Copy } from 'lucide-react';

const VideoCall = () => {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [remotePeerId, setRemotePeerId] = useState('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [call, setCall] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoHidden, setIsVideoHidden] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

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

    const handleClose = () => {
        endCall();
    };

    call.on('close', handleClose);

    // Clean up listener when call changes or component unmounts
    return () => {
        call.off?.('close', handleClose);
    };
  }, [call]);


  useEffect(() => {
    const newPeer = new Peer();

    newPeer.on('open', id => {
      setPeerId(id as string);
    });

    newPeer.on('call', incomingCall => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then(stream => {
          (localStreamRef as any).current = stream;
          if (localVideoRef.current) (localVideoRef.current as any).srcObject = stream;
          incomingCall.answer(stream);
          incomingCall.on('stream', remoteStream => {
            if (remoteVideoRef.current)
              (remoteVideoRef.current as any).srcObject = remoteStream;
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
  }, []);

  const callPeer = () => {
    if (!peer || !remotePeerId) return;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(stream => {
        (localStreamRef as any).current = stream;
        if (localVideoRef.current) (localVideoRef.current as any).srcObject = stream;

        const outgoingCall = peer.call(remotePeerId, stream);
        outgoingCall.on('stream', remoteStream => {
          if (remoteVideoRef.current)
            (remoteVideoRef.current as any).srcObject = remoteStream;
        });
        setCall(outgoingCall);
      });
  };

  const endCall = () => {
    call?.close();
    if ((localStreamRef as any).current) {
      (localStreamRef as any).current.getTracks().forEach((track: any) => track.stop());
      (localStreamRef as any).current = null;
    }
    if ((screenStreamRef as any).current) {
      (screenStreamRef as any).current.getTracks().forEach((track: any) => track.stop());
      (screenStreamRef as any).current = null;
    }
    if ((localVideoRef as any).current) (localVideoRef as any).current.srcObject = null;
    if ((remoteVideoRef as any).current) (remoteVideoRef as any).current.srcObject = null;

    setCall(null);
    setIsMuted(false);
    setIsVideoHidden(false);
    setIsScreenSharing(false);
  };

  const toggleMute = () => {
    if ((localStreamRef as any).current) {
      const audioTrack = (localStreamRef as any).current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if ((localStreamRef as any).current) {
      const videoTrack = (localStreamRef as any).current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoHidden(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) stopScreenShare();
    else startScreenShare();
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      (screenStreamRef as any).current = screenStream;
      const sender = (call as any).peerConnection
        .getSenders()
        .find((s: any) => s.track.kind === 'video');
      if (sender) sender.replaceTrack(screenStream.getVideoTracks()[0]);
      if ((localVideoRef as any).current)
        (localVideoRef as any).current.srcObject = screenStream;

      screenStream.getVideoTracks()[0].onended = () => stopScreenShare();
      setIsScreenSharing(true);
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = () => {
    if ((screenStreamRef as any).current)
      (screenStreamRef as any).current.getTracks().forEach((track: any) => track.stop());
    const sender = (call as any).peerConnection
      .getSenders()
      .find((s: any) => s.track.kind === 'video');
    if (sender && (localStreamRef as any).current) {
      sender.replaceTrack((localStreamRef as any).current.getVideoTracks()[0]);
      if ((localVideoRef as any).current)
        (localVideoRef as any).current.srcObject = (localStreamRef as any).current;
    }
    setIsScreenSharing(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center py-8 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg p-6 max-w-3xl w-full">
        <h2 className="text-2xl font-semibold mb-2 text-center">🎥 PeerJS Video Call</h2>
        <p className="text-gray-400 text-center text-sm mb-6">
          Share your Peer ID with a friend. They can enter it below and click <b>Call</b> to start a chat.
        </p>

        <div className="flex items-center justify-center bg-gray-800 p-3 rounded-lg mb-4">
          <span className="text-sm text-gray-300 mr-2">Your ID:</span>
          <span className="font-mono text-green-400 break-all">{peerId || 'Generating...'}</span>
          <button
            onClick={copyToClipboard}
            className="ml-3 p-1.5 hover:bg-gray-700 rounded-md"
          >
            {copied ? (
              <span className="text-green-400 text-xs">Copied!</span>
            ) : (
              <Copy size={18} />
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 mb-6">
          <input
            type="text"
            value={remotePeerId}
            onChange={e => setRemotePeerId(e.target.value)}
            placeholder="Enter remote peer ID"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={callPeer}
            className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg text-white flex items-center gap-2"
          >
            <Phone size={16} /> Call
          </button>
        </div>

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
            <button onClick={toggleScreenShare} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg flex items-center gap-2">
              <ScreenShare size={18} />
              {isScreenSharing ? 'Stop Share' : 'Share Screen'}
            </button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <h3 className="text-center text-gray-400 py-2 text-sm">Local Video</h3>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video bg-black object-cover"
            />
          </div>
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <h3 className="text-center text-gray-400 py-2 text-sm">Remote Video</h3>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full aspect-video bg-black object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
