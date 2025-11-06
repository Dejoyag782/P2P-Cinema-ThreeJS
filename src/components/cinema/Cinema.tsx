import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader, PointerLockControls } from 'three-stdlib';

interface CinemaVideoProps {
  videoElement?: HTMLVideoElement | null;
  videoStream?: MediaStream | null;
  width?: number;
  height?: number;
  modelUrl?: string;
}

const CinemaVideo: React.FC<CinemaVideoProps> = ({
  videoElement = null,
  videoStream = null,
  width = window.innerWidth,
  height = window.innerHeight,
  modelUrl = "/models/cinema.glb",
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Create video element if not provided
    const video = videoElement || document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;

    // Handle video stream
    if (videoStream) {
      console.log('🎥 Binding MediaStream to video element...');
      video.srcObject = videoStream;
      video.onloadedmetadata = () => {
        video.play().catch(err => console.warn('Autoplay blocked:', err));
      };
    } else {
      console.log('🌸 Using fallback demo video');
      video.src = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
      video.play().catch(console.warn);
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07060a);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 2.5, 2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mountRef.current.innerHTML = ''; // Clear previous renderer if any
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.1);
    directional.position.set(5, 10, 5);
    scene.add(directional);

    // Screen glow
    const screenLight = new THREE.PointLight(0xffffff, 1.2, 20);
    screenLight.position.set(0, 3.3, -4.2);
    scene.add(screenLight);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x080608, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Load cinema model
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(0, 0, 0.55);
        model.rotation.y = Math.PI;
        model.scale.set(1, 1, 1);
        scene.add(model);
      },
      undefined,
      (error) => console.error('Error loading model:', error)
    );

    // Video texture and screen
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
    <div className="relative w-full h-full flex items-center justify-center bg-none">
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      <div className="absolute bottom-4 text-white text-sm opacity-80">
        Click to look around (Esc to exit)
      </div>
    </div>
  );
}

export default CinemaVideo;


// import { useEffect, useRef } from 'react';
// import * as THREE from 'three';
// import { GLTFLoader, PointerLockControls } from 'three-stdlib';

// interface CinemaVideoProps {
//   videoRef?: React.RefObject<HTMLVideoElement>;
//   width?: number;
//   height?: number;
//   modelUrl?: string;
// }

// const CinemaVideo: React.FC<CinemaVideoProps> = ({
//   videoRef,
//   width = window.innerWidth,
//   height = window.innerHeight,
//   modelUrl = "/models/cinema.glb",
// }) => {
//   const mountRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!mountRef.current) return;

//     // 🎬 Pick the provided video element or a fallback
//     const video =
//       videoRef?.current || document.createElement('video');

//     video.crossOrigin = 'anonymous';
//     video.loop = true;
//     video.muted = true;
//     video.playsInline = true;

//     // Fallback demo video if no ref is active
//     if (!videoRef?.current) {
//       console.log('🌸 Using fallback demo video');
//       video.src =
//         'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
//       video.play().catch(console.warn);
//     }

//     // --- Three.js Scene Setup ---
//     const scene = new THREE.Scene();
//     scene.background = new THREE.Color(0x07060a);

//     const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
//     camera.position.set(0, 2.5, 2);

//     const renderer = new THREE.WebGLRenderer({ antialias: true });
//     renderer.setPixelRatio(window.devicePixelRatio);
//     renderer.setSize(width, height);
//     mountRef.current.innerHTML = '';
//     mountRef.current.appendChild(renderer.domElement);

//     // Lights
//     const ambient = new THREE.AmbientLight(0xffffff, 0.15);
//     scene.add(ambient);

//     const directional = new THREE.DirectionalLight(0xffffff, 0.1);
//     directional.position.set(5, 10, 5);
//     scene.add(directional);

//     const screenLight = new THREE.PointLight(0xffffff, 1.2, 20);
//     screenLight.position.set(0, 3.3, -4.2);
//     scene.add(screenLight);

//     // Floor
//     const floor = new THREE.Mesh(
//       new THREE.PlaneGeometry(50, 50),
//       new THREE.MeshStandardMaterial({ color: 0x080608, roughness: 0.9 })
//     );
//     floor.rotation.x = -Math.PI / 2;
//     scene.add(floor);

//     // Load Cinema Model
//     const loader = new GLTFLoader();
//     loader.load(
//       modelUrl,
//       (gltf) => {
//         const model = gltf.scene;
//         model.position.set(0, 0, 0.55);
//         model.rotation.y = Math.PI;
//         model.scale.set(1, 1, 1);
//         scene.add(model);
//       },
//       undefined,
//       (error) => console.error('Error loading model:', error)
//     );

//     // 🎥 Video Texture
//     const videoTexture = new THREE.VideoTexture(video);
//     videoTexture.minFilter = THREE.LinearFilter;
//     videoTexture.magFilter = THREE.LinearFilter;
//     videoTexture.colorSpace = THREE.SRGBColorSpace;

//     const screen = new THREE.Mesh(
//       new THREE.PlaneGeometry(13, 6.5),
//       new THREE.MeshBasicMaterial({ map: videoTexture })
//     );
//     screen.position.set(0, 3.3, -4);
//     scene.add(screen);

//     // Pointer Lock Controls
//     const controls = new PointerLockControls(camera, renderer.domElement);
//     const onClick = () => controls.lock();
//     renderer.domElement.addEventListener('click', onClick);

//     // Animation Loop
//     let stop = false;
//     const animate = () => {
//       if (stop) return;
//       renderer.render(scene, camera);
//       requestAnimationFrame(animate);
//     };
//     animate();

//     return () => {
//       stop = true;
//       renderer.domElement.removeEventListener('click', onClick);
//       renderer.dispose();
//       scene.clear();
//     };
//   }, [videoRef?.current, modelUrl]);

//   return (
//     <div className="relative w-full h-full flex items-center justify-center bg-none">
//       <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
//       <div className="absolute bottom-4 text-white text-sm opacity-80">
//         Click to look around (Esc to exit)
//       </div>
//     </div>
//   );
// };

// export default CinemaVideo;
