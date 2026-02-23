import { Copy, Mic, MicOff, Phone, ScreenShare, User, Video, VideoOff, XCircle } from "lucide-react";

type ControlsPanelProps = {
  visible: boolean;
  mode: "host" | "join";
  peerId: string;
  copied: boolean;
  viewerConnCount: number;
  connectedViewerIds: string[];
  hostMutedViewerIds: Set<string>;
  remoteId: string;
  isMuted: boolean;
  isVideoHidden: boolean;
  isSharingScreen: boolean;
  isMobile: boolean;
  gyroEnabled: boolean;
  audioInputDevices: MediaDeviceInfo[];
  selectedMicId: string;
  onCopyToClipboard: () => void;
  onToggleHostViewerMute: (viewerId: string) => void;
  onDisconnectViewer: (viewerId: string) => void;
  onRemoteIdChange: (value: string) => void;
  onStartCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleGyro: () => void;
  onMicChange: (value: string) => void;
};

export default function ControlsPanel({
  visible,
  mode,
  peerId,
  copied,
  viewerConnCount,
  connectedViewerIds,
  hostMutedViewerIds,
  remoteId,
  isMuted,
  isVideoHidden,
  isSharingScreen,
  isMobile,
  gyroEnabled,
  audioInputDevices,
  selectedMicId,
  onCopyToClipboard,
  onToggleHostViewerMute,
  onDisconnectViewer,
  onRemoteIdChange,
  onStartCall,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleGyro,
  onMicChange,
}: ControlsPanelProps) {
  if (!visible) return null;

  return (
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
                <div className="font-mono text-sm text-emerald-200 break-all">
                  {peerId || "Generating..."}
                </div>
              </div>
              <button
                onClick={onCopyToClipboard}
                className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10"
              >
                {copied ? (
                  <span className="text-emerald-200">Copied</span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Copy size={16} /> Copy
                  </span>
                )}
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
                        onClick={() => onToggleHostViewerMute(viewerId)}
                        className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/80 transition hover:bg-white/10"
                      >
                        {hostMutedViewerIds.has(viewerId) ? "Unmute" : "Mute"}
                      </button>
                      <button
                        onClick={() => onDisconnectViewer(viewerId)}
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
              onChange={(e) => onRemoteIdChange(e.target.value)}
              placeholder="Enter host ID"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-400/30"
            />
            <button
              onClick={onStartCall}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/15 active:scale-[0.99]"
            >
              <Phone size={16} /> Connect
            </button>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={onEndCall}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/15 active:scale-[0.99]"
          >
            <XCircle size={18} /> End
          </button>

          <button
            onClick={onToggleMute}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-[0.99]"
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            {isMuted ? "Unmute" : "Mute"}
          </button>

          <button
            onClick={onToggleVideo}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-[0.99]"
          >
            {isVideoHidden ? <VideoOff size={18} /> : <Video size={18} />}
            {isVideoHidden ? "Show" : "Hide"}
          </button>

          {mode === "host" && (
            <button
              onClick={onToggleScreenShare}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-[0.99]"
            >
              <ScreenShare size={18} />
              {isSharingScreen ? "Stop Share" : "Share Screen"}
            </button>
          )}

          {isMobile && (
            <button
              onClick={onToggleGyro}
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
            onChange={(e) => onMicChange(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-400/30"
          >
            {audioInputDevices.length === 0 && <option value="default">Default microphone</option>}
            {audioInputDevices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
