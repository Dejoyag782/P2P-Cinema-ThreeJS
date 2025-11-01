// import { useState } from "react";
import "./App.css";
// import HostRoom from "./components/host/HostRoom";
// import ViewerRoom from "./components/viewer/ViewerRoom";
// import cinemaGlb from "./assets/glb/cinema.glb";
import VideoRoom from "./components/video-room";

function App() {
  // const [mode, setMode] = useState<"none" | "host" | "viewer">("none");
  // const [hostId, setHostId] = useState("");
  // const gltfUrl = cinemaGlb;

  return (
    // <div className="relative w-screen h-screen overflow-hidden bg-black">
    //   {/* 🎛️ Overlay UI */}
    //   <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white pointer-events-auto">
    //     {mode === "none" && (
    //       <div className="flex flex-col items-center justify-center space-y-4 bg-black/60 p-8 rounded-xl">
    //         <h1 className="text-3xl font-bold">🎬 Cinema Simulator</h1>

    //         <button
    //           onClick={() => setMode("host")}
    //           className="p-3 bg-white text-black rounded-lg hover:bg-gray-200"
    //         >
    //           Create Room (Host)
    //         </button>

    //         <div className="flex items-center space-x-2">
    //           <input
    //             type="text"
    //             placeholder="Enter Host ID"
    //             value={hostId}
    //             onChange={(e) => setHostId(e.target.value)}
    //             className="p-2 text-black rounded"
    //           />
    //           <button
    //             onClick={() => setMode("viewer")}
    //             className="p-3 bg-white text-black rounded-lg hover:bg-gray-200"
    //           >
    //             Join Room (Viewer)
    //           </button>
    //         </div>
    //       </div>
    //     )}

    //     {mode === "host" && (
    //       <HostRoom peerServerConfig={{}} gLTFUrl={gltfUrl} />
    //     )}

    //     {mode === "viewer" && (
    //       <ViewerRoom hostId={hostId} gLTFUrl={gltfUrl} peerServerConfig={{}} />
    //     )}
    //   </div>
    // </div>
    <VideoRoom />
  );
}

export default App;
