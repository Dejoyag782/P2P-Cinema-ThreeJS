// import React, { useState, useRef, useEffect } from "react";
// import Peer from "peerjs";

// export default function PeerVideoRoom() {
//   const [role, setRole] = useState(null);
//   const [peerId, setPeerId] = useState("");
//   const [roomId, setRoomId] = useState("");
//   const [remoteStream, setRemoteStream] = useState(null);
//   const [isStreaming, setIsStreaming] = useState(false);
//   const [videoLoaded, setVideoLoaded] = useState(false);

//   const peerRef = useRef(null);
//   const videoRef = useRef(null);
//   const remoteVideoRef = useRef(null);
//   const streamRef = useRef(null);

//   // --- Initialize PeerJS ---
//   useEffect(() => {
//     const peer = new Peer();

//     peer.on("open", (id) => {
//       console.log("My Peer ID:", id);
//       setPeerId(id);
//     });

//     // viewer listens for incoming call *before* connecting
//     peer.on("call", (call) => {
//       console.log("Incoming stream from host...");
//       call.answer();
//       call.on("stream", (stream) => {
//         setRemoteStream(stream);
//       });
//     });

//     peerRef.current = peer;
//     return () => peer.destroy();
//   }, []);

//   // --- HOST LOGIC ---
//   const handleFileLoad = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     const url = URL.createObjectURL(file);
//     videoRef.current.src = url;
//     videoRef.current.play();
//     setVideoLoaded(true);
//   };

//   const startHosting = () => {
//     if (!videoLoaded) return;
//     const stream = videoRef.current.captureStream();
//     streamRef.current = stream;
//     setIsStreaming(true);

//     peerRef.current.on("connection", (conn) => {
//       console.log("Viewer connected:", conn.peer);
//       const call = peerRef.current.call(conn.peer, streamRef.current);
//       call.on("error", (err) => console.error("Call error:", err));
//     });

//     alert(`Now hosting! Share this Room ID: ${peerId}`);
//   };

//   // --- VIEWER LOGIC ---
//   const joinRoom = () => {
//     if (!roomId) return alert("Enter a room ID first!");
//     console.log("Connecting to host:", roomId);
//     const conn = peerRef.current.connect(roomId);
//     conn.on("open", () => {
//       console.log("Connected to host. Waiting for stream...");
//     });
//   };

//   useEffect(() => {
//     if (remoteVideoRef.current && remoteStream) {
//       remoteVideoRef.current.srcObject = remoteStream;
//       remoteVideoRef.current.play().catch(() => {});
//     }
//   }, [remoteStream]);

//   return (
//     <div className="relative w-screen h-screen bg-black overflow-hidden">
//       {/* --- Background Video (host or viewer) --- */}
//       {role === "host" ? (
//         <video
//           ref={videoRef}
//           className="absolute inset-0 w-full h-full object-cover bg-black"
//           controls
//         />
//       ) : (
//         <video
//           ref={remoteVideoRef}
//           className="absolute inset-0 w-full h-full object-cover bg-black"
//           controls
//         />
//       )}

//       {/* --- Floating Control Box --- */}
//       {!role ? (
//         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white space-y-6">
//           <h1 className="text-3xl font-bold">🎥 PeerJS Video Room</h1>
//           <p className="text-lg font-medium">Choose your role:</p>
//           <div className="flex space-x-4">
//             <button
//               onClick={() => setRole("host")}
//               className="px-6 py-3 bg-blue-600 hover:bg-blue-700 transition rounded-xl shadow-md"
//             >
//               I’m the Host
//             </button>
//             <button
//               onClick={() => setRole("viewer")}
//               className="px-6 py-3 bg-green-600 hover:bg-green-700 transition rounded-xl shadow-md"
//             >
//               I’m a Viewer
//             </button>
//           </div>
//         </div>
//       ) : (
//         <div className="absolute top-6 right-6 bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-2xl p-5 w-80 text-white shadow-lg space-y-4 transition">
//           {role === "host" && (
//             <>
//               <h2 className="text-xl font-semibold mb-2">Host Panel</h2>
//               <p className="text-sm">
//                 Room ID:{" "}
//                 <span className="font-mono bg-gray-800 px-2 py-1 rounded text-blue-400">
//                   {peerId || "Loading..."}
//                 </span>
//               </p>
//               <input
//                 type="file"
//                 accept="video/*"
//                 onChange={handleFileLoad}
//                 className="block w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
//               />
//               <button
//                 onClick={startHosting}
//                 disabled={!videoLoaded || isStreaming}
//                 className={`mt-2 px-6 py-3 w-full rounded-xl font-medium transition ${
//                   videoLoaded && !isStreaming
//                     ? "bg-blue-600 hover:bg-blue-700"
//                     : "bg-gray-700 cursor-not-allowed"
//                 }`}
//               >
//                 {isStreaming ? "Streaming..." : "Start Streaming"}
//               </button>
//             </>
//           )}

//           {role === "viewer" && (
//             <>
//               <h2 className="text-xl font-semibold mb-2">Viewer Panel</h2>
//               <input
//                 type="text"
//                 placeholder="Enter Room ID"
//                 value={roomId}
//                 onChange={(e) => setRoomId(e.target.value)}
//                 className="border border-gray-700 bg-gray-800 text-white p-2 rounded-lg w-full focus:ring-2 focus:ring-green-500 outline-none"
//               />
//               <button
//                 onClick={joinRoom}
//                 className="mt-3 px-6 py-3 w-full bg-green-600 hover:bg-green-700 rounded-xl transition font-medium"
//               >
//                 Join Room
//               </button>
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
