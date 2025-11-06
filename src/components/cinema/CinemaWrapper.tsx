// components/cinema/CinemaWrapper.tsx
import CinemaVideo from "./Cinema";
import CinemaModel from "../../assets/glb/cinema.glb";

interface Props {
  videoElement?: HTMLVideoElement | null;
  videoStream?: MediaStream | null;
  width?: number;
  height?: number;
}

/**
 * Simple wrapper around the CinemaVideo component.
 * Automatically re-renders when videoElement or videoStream changes.
 */
export default function CinemaWrapper({
  videoElement,
  videoStream,
  width = window.innerWidth,
  height = window.innerHeight,
}: Props) {

  console.log("videoElement", videoElement);
  console.log("videoStream", videoStream);
  
  return (
    <>
    {/* <video src={videoStream?.getVideoTracks()[0] as any} autoPlay /> */}
      <CinemaVideo
      key={
        videoStream
          ? "cinema-stream"
          : videoElement
          ? "cinema-element"
          : "cinema-default"
      }
      videoElement={videoElement}
        videoStream={videoStream}
        modelUrl={CinemaModel}
        width={width}
        height={height}
      />
    </>
  );
}
