export type ChatMessage = { sender: string; text: string };

export type SeatOption = {
  id: string;
  label: string;
  row: string;
  description: string;
  cameraPosition: [number, number, number];
};
