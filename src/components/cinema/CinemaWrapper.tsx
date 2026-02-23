// components/cinema/CinemaWrapper.tsx
import CinemaVideo from "./Cinema";
import CinemaModel from "../../assets/glb/cinema.glb";

interface Props {
  videoElement?: HTMLVideoElement | null;
  videoStream?: MediaStream | null;
  width?: number;
  height?: number;
  isHost?: boolean;
  initialCameraPosition?: [number, number, number];
  enableGyro?: boolean;
  onAssetsLoaded?: () => void;
  onAssetsProgress?: (progress: { itemsLoaded: number; itemsTotal: number; ratio: number }) => void;
  onAssetsError?: (error: unknown) => void;
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
  isHost = false,
  initialCameraPosition = [0, 3, 3.5],
  enableGyro = false,
  onAssetsLoaded,
  onAssetsProgress,
  onAssetsError,
}: Props) {

  return (
    <>
    {/* <video src={videoStream?.getVideoTracks()[0] as any} autoPlay /> */}
      <CinemaVideo
      videoElement={videoElement as any}
        videoStream={videoStream as any}
        modelUrl={CinemaModel}
        width={width}
        height={height}
        isHost={isHost}
        initialCameraPosition={initialCameraPosition}
        enableGyro={enableGyro}
        onAssetsLoaded={onAssetsLoaded}
        onAssetsProgress={onAssetsProgress}
        onAssetsError={onAssetsError}
      />
    </>
  );
}
