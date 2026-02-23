type AudioStreamListProps = {
  streams: { id: string; stream: MediaStream }[];
  mutedIds?: Set<string>;
};

export default function AudioStreamList({ streams, mutedIds }: AudioStreamListProps) {
  if (streams.length === 0) return null;

  return (
    <div className="hidden">
      {streams.map((item) => (
        <audio
          key={item.id}
          autoPlay
          playsInline
          muted={mutedIds?.has(item.id)}
          ref={(el) => {
            if (el && el.srcObject !== item.stream) {
              el.srcObject = item.stream;
            }
          }}
        />
      ))}
    </div>
  );
}
