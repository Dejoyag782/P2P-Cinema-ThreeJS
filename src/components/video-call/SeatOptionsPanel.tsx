import type { SeatOption } from "./types";
import { SEAT_OPTIONS, SEAT_ROWS } from "./seat-data";

type SeatOptionsPanelProps = {
  visible: boolean;
  seatPanelWidthRem: number;
  selectedSeatId: string;
  onSelectSeat: (seatId: string) => void;
};

export default function SeatOptionsPanel({
  visible,
  seatPanelWidthRem,
  selectedSeatId,
  onSelectSeat,
}: SeatOptionsPanelProps) {
  if (!visible) return null;

  return (
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
                    style={{
                      gridTemplateColumns: `repeat(${rowSeats.length}, minmax(2.5rem, 2.5rem))`,
                    }}
                  >
                    {rowSeats.map((seat: SeatOption) => {
                      const isSelected = seat.id === selectedSeatId;
                      return (
                        <button
                          key={seat.id}
                          onClick={() => onSelectSeat(seat.id)}
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
  );
}
