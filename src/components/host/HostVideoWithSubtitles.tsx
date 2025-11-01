import { useEffect, useState } from "react";

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

interface HostVideoWithSubtitlesProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isHost: boolean;
  broadcast: (msg: any) => void;
}

export default function HostVideoWithSubtitles({
  videoRef,
  isHost,
  broadcast,
}: HostVideoWithSubtitlesProps) {
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");

  // === Handle .srt file load ===
  const handleSubtitleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const cues = text
        .split(/\n\n/)
        .map((chunk) => {
          const parts = chunk.split("\n");
          if (parts.length >= 3) {
            const times = parts[1].split(" --> ");
            return {
              start: parseTime(times[0]),
              end: parseTime(times[1]),
              text: parts.slice(2).join(" "),
            };
          }
          return null;
        })
        .filter(Boolean) as SubtitleCue[];
      setSubtitleCues(cues);
    };
    reader.readAsText(file);
  };

  // === Parse SRT timestamp (e.g. 00:00:12,500) ===
  const parseTime = (str: string) => {
    const [h, m, s] = str.replace(",", ".").split(":").map(Number);
    return h * 3600 + m * 60 + s;
  };

  // === Periodic subtitle sync + broadcast ===
  useEffect(() => {
    if (!videoRef.current || subtitleCues.length === 0) return;

    const interval = setInterval(() => {
      const currentTime = videoRef.current?.currentTime ?? 0;
      const cue = subtitleCues.find(
        (c) => currentTime >= c.start && currentTime <= c.end
      );
      const text = cue ? cue.text : "";
      setCurrentSubtitle(text);

      // Host broadcasts subtitles to all connected viewers
      if (isHost) {
        broadcast({ type: "subtitle", text });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [subtitleCues, isHost]);

  return (
    <div className="mt-3 text-sm">
      <label className="block mb-1 font-semibold">Upload Subtitles (.srt):</label>
      <input
        type="file"
        accept=".srt"
        onChange={(e) => e.target.files && handleSubtitleUpload(e.target.files[0])}
        className="block w-full text-xs mb-2"
      />
      {currentSubtitle && (
        <p className="mt-2 text-white bg-black/50 px-2 py-1 rounded text-center">
          {currentSubtitle}
        </p>
      )}
    </div>
  );
}
