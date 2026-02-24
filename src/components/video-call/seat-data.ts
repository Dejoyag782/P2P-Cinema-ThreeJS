import type { SeatOption } from "./types";

const SEAT_X_POSITIONS = [
  -5.5,
  -5.15,
  -4.8,
  -4.45,
  -4.1,
  -3.75,
  -3.5,
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
  3.5,
  3.75,
  4.1,
  4.45,
  4.8,
  5.15,
  5.5,
];

export const SEAT_ROWS: { key: SeatOption["row"]; label: string; y: number; z: number; maxSeats: number }[] = [
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

export const SEAT_OPTIONS: SeatOption[] = SEAT_ROWS.flatMap((row) =>
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
