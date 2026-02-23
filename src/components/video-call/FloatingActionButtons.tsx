import { GalleryThumbnails, MessageCircleMore, Settings } from "lucide-react";

type FloatingActionButtonsProps = {
  visible: boolean;
  controlsVisible: boolean;
  messagesVisible: boolean;
  seatOptionsVisible: boolean;
  messagesCount: number;
  onToggleControls: () => void;
  onToggleMessages: () => void;
  onToggleSeatOptions: () => void;
};

export default function FloatingActionButtons({
  visible,
  controlsVisible,
  messagesVisible,
  seatOptionsVisible,
  messagesCount,
  onToggleControls,
  onToggleMessages,
  onToggleSeatOptions,
}: FloatingActionButtonsProps) {
  if (!visible) return null;

  return (
    <>
      <button
        onClick={onToggleControls}
        className="group absolute top-4 right-4 sm:top-6 sm:right-6 z-50 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-2 sm:px-3.5 sm:py-3 text-white/90 shadow-2xl backdrop-blur-xl transition hover:bg-white/10 hover:border-white/15 active:scale-[0.99]"
      >
        <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition group-hover:ring-white/20">
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
        onClick={onToggleMessages}
        className="group absolute top-16 right-4 sm:top-20 sm:right-6 z-50 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-2 sm:px-3.5 sm:py-3 text-white/90 shadow-2xl backdrop-blur-xl transition hover:bg-white/10 hover:border-white/15 active:scale-[0.99]"
      >
        <span className="relative inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition group-hover:ring-white/20">
          <MessageCircleMore size={18} />
          {messagesCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex min-w-[18px] items-center justify-center rounded-full border border-white/15 bg-rose-500/80 px-1 text-[10px] font-semibold text-white shadow">
              {messagesCount}
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
        onClick={onToggleSeatOptions}
        className="group absolute top-[6.5rem] right-4 sm:top-[8.4rem] sm:right-6 z-50 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-2 sm:px-3.5 sm:py-3 text-white/90 shadow-2xl backdrop-blur-xl transition hover:bg-white/10 hover:border-white/15 active:scale-[0.99]"
      >
        <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition group-hover:ring-white/20">
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
    </>
  );
}
