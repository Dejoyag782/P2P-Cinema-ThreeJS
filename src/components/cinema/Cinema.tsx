import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader, PointerLockControls } from 'three-stdlib';

interface CinemaVideoProps {
  videoElement?: HTMLVideoElement | null;
  videoStream?: MediaStream | null;
  width?: number;
  height?: number;
  modelUrl?: string;
}

export default function CinemaVideo({
  videoElement = null,
  videoStream = null,
  width = 1280,
  height = 720,
  modelUrl = "/models/cinema.glb",
}: CinemaVideoProps) {
  const mountRef = useRef(null);
//   const [renderer, setRenderer] = useState(null);

  // useEffect(() => {
  //   let video = videoElement;
  //   if (!video) {
  //     video = document.createElement("video");
  //     (video as any).crossOrigin = "anonymous";
  //     (video as any).loop = true;
  //     (video as any).muted = true;
  //     (video as any).playsInline = true;
  //     (video as any).src =
  //       "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  //     (video as any)?.play().catch(() => {});
  //   }

  //   if (videoStream) {
  //     (video as any).srcObject = videoStream;
  //     (video as any).muted = true;
  //     (video as any)?.play().catch((err: any) => console.warn("Autoplay failed:", err));
  //   }

  //   // --- Scene Setup ---
  //   const scene = new THREE.Scene();
  //   scene.background = new THREE.Color(0x07060a);

  //   const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
  //   camera.position.set(0, 2.5, 2); // fixed position

  //   const renderer = new THREE.WebGLRenderer({ antialias: true });
  //   renderer.setPixelRatio(window.devicePixelRatio);
  //   renderer.setSize(width * 1.05, height * 1.05);
  //   (mountRef.current as any).appendChild(renderer.domElement);
  //   // setRenderer(renderer as any);

  //   // Lights
  //   // Dim ambient light for darker surroundings
  //   const ambient = new THREE.AmbientLight(0xffffff, 0.15);
  //   scene.add(ambient);

  //   // Slight, soft directional light to give minimal shape definition
  //   const directional = new THREE.DirectionalLight(0xffffff, 0.1);
  //   directional.position.set(5, 10, 5);
  //   scene.add(directional);

  //   // Optional: simulate screen glow with a soft point light
  //   const screenLight = new THREE.PointLight(0xffffff, 1.2, 20);
  //   screenLight.position.set(0, 3.3, -4.2);
  //   scene.add(screenLight);


  //   // Optional floor
  //   const floor = new THREE.Mesh(
  //     new THREE.PlaneGeometry(50, 50),
  //     new THREE.MeshStandardMaterial({ color: 0x080608, roughness: 0.9 })
  //   );
  //   floor.rotation.x = -Math.PI / 2;
  //   scene.add(floor);

  //   // --- Load GLB Cinema Model ---
  //   const loader = new GLTFLoader();
  //   loader.load(
  //     modelUrl,
  //     (gltf) => {
  //       const model = gltf.scene;
  //       model.position.set(0, 0, 0.55);
  //       model.rotation.y = Math.PI;
  //       model.scale.set(1, 1, 1);
  //       scene.add(model);
  //     },
  //     (xhr) => console.log(`Loading cinema: ${(xhr.loaded / xhr.total) * 100}%`),
  //     (error) => console.error("Error loading model:", error)
  //   );

  //   // --- Video Texture ---
  //   const videoTexture = new THREE.VideoTexture(video);
  //   videoTexture.minFilter = THREE.LinearFilter;
  //   videoTexture.magFilter = THREE.LinearFilter;
  //   (videoTexture as any).encoding = (THREE as any).sRGBEncoding;

  //   // Screen (adjust for your model)
  //   const screen = new THREE.Mesh(
  //     new THREE.PlaneGeometry(13, 6.5),
  //     new THREE.MeshBasicMaterial({ map: videoTexture })
  //   );
  //   screen.position.set(0, 3.3, -4);
  //   scene.add(screen);

  //   // --- Pointer Lock Controls (Fixed camera position, mouse look only) ---
  //   const controls = new PointerLockControls(camera, renderer.domElement);

  //   const onClick = () => {
  //     controls.lock(); // click to enable look-around
  //   };
  //   renderer.domElement.addEventListener("click", onClick);

  //   // --- Animate ---
  //   let stop = false;
  //   const animate = () => {
  //     if (stop) return;
  //     renderer.render(scene, camera);
  //     requestAnimationFrame(animate);
  //   };
  //   animate();

  //   // Cleanup
  //   return () => {
  //     stop = true;
  //     renderer.domElement.removeEventListener("click", onClick);
  //     renderer.dispose();
  //     scene.clear();
  //   };
  // }, [videoElement, videoStream, modelUrl]);

  useEffect(() => {
    let video = videoElement;

    // 🎥 Create fallback video element if none passed
    if (!video) {
      video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
    }

    // 🎬 Bind WebRTC or fallback source
    if (videoStream) {
      console.log("🎥 Binding MediaStream to video element...");
      video.srcObject = videoStream;
      video.onloadedmetadata = () => {
        video.play().catch(err => console.warn("Autoplay blocked:", err));
      };
    } else {
      console.log("🌸 Using fallback demo video");
      video.src =
        "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
      video.play().catch(() => {});
    }

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07060a);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 2.5, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width * 1.05, height * 1.05);
    (mountRef.current as any).appendChild(renderer.domElement);

    // --- Lights ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.1);
    directional.position.set(5, 10, 5);
    scene.add(directional);

    // --- Cinema model ---
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(0, 0, 0.55);
        model.rotation.y = Math.PI;
        scene.add(model);
      },
      undefined,
      (error) => console.error("Error loading model:", error)
    );

    // --- Video Texture ---
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 6.5),
      new THREE.MeshBasicMaterial({ map: videoTexture })
    );
    screen.position.set(0, 3.3, -4);
    scene.add(screen);

    // --- Pointer Lock ---
    const controls = new PointerLockControls(camera, renderer.domElement);
    const onClick = () => controls.lock();
    renderer.domElement.addEventListener("click", onClick);

    // --- Animate ---
    let stop = false;
    const animate = () => {
      if (stop) return;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      stop = true;
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      scene.clear();
    };
  }, [videoStream, modelUrl]);


  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      <div className="absolute bottom-4 text-white text-sm opacity-80">
        Click to look around (Esc to exit)
      </div>
    </div>
  );
}
