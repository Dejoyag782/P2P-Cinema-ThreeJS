type NamePromptModalProps = {
  visible: boolean;
  nameInput: string;
  onNameInputChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function NamePromptModal({
  visible,
  nameInput,
  onNameInputChange,
  onConfirm,
  onCancel,
}: NamePromptModalProps) {
  if (!visible) return null;

  return (
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
            onChange={(e) => onNameInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onConfirm()}
            placeholder="Enter your name"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-emerald-400/30"
          />
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onConfirm}
              className="flex-1 rounded-2xl border border-emerald-400/30 bg-emerald-400/15 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 active:scale-[0.99]"
            >
              Continue
            </button>
            <button
              onClick={onCancel}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 active:scale-[0.99]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
