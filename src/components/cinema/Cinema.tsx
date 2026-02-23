import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DeviceOrientationControls, GLTFLoader, PointerLockControls } from 'three-stdlib';

interface CinemaVideoProps {
  videoElement?: HTMLVideoElement | null;
  videoStream?: MediaStream | null;
  width?: number;
  height?: number;
  modelUrl?: string;
  isHost?: boolean;
  initialCameraPosition?: [number, number, number];
  enableGyro?: boolean;
  onAssetsLoaded?: () => void;
  onAssetsProgress?: (progress: { itemsLoaded: number; itemsTotal: number; ratio: number }) => void;
  onAssetsError?: (error: unknown) => void;
}

const CinemaVideo: React.FC<CinemaVideoProps> = ({
  videoElement = null,
  videoStream = null,
  width = window.innerWidth,
  height = window.innerHeight,
  modelUrl = "/models/cinema.glb",
  isHost = false,
  initialCameraPosition = [0, 3, 3.5],
  enableGyro = false,
  onAssetsLoaded,
  onAssetsProgress,
  onAssetsError,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetPositionRef = useRef<[number, number, number]>(initialCameraPosition);
  const enableGyroRef = useRef(enableGyro);
  const controlsRef = useRef<PointerLockControls | null>(null);
  const gyroControlsRef = useRef<DeviceOrientationControls | null>(null);

  useEffect(() => {
    enableGyroRef.current = enableGyro;
  }, [enableGyro]);

  useEffect(() => {
    if (!mountRef.current) return;
    let didSignalLoaded = false;
    const signalLoaded = () => {
      if (didSignalLoaded) return;
      didSignalLoaded = true;
      onAssetsLoaded?.();
    };

    // Create video element if not provided
    const video = videoElement || document.createElement('video');
    console.log('isHost', isHost);
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = isHost;
    video.playsInline = true;

    // Handle video stream
    if (videoStream) {
      console.log('🎥 Binding MediaStream to video element...');
      video.srcObject = videoStream;
      video.muted = isHost;
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
    camera.position.set(...initialCameraPosition);
    camera.lookAt(0, 3.3, -4);
    cameraRef.current = camera;
    targetPositionRef.current = initialCameraPosition;

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
    const loadingManager = new THREE.LoadingManager();
    loadingManager.onLoad = () => signalLoaded();
    loadingManager.onProgress = (_url, itemsLoaded, itemsTotal) => {
      const ratio = itemsTotal > 0 ? itemsLoaded / itemsTotal : 0;
      onAssetsProgress?.({ itemsLoaded, itemsTotal, ratio });
    };
    loadingManager.onError = (url) => {
      onAssetsError?.(new Error(`Failed to load asset: ${url}`));
    };

    const loader = new GLTFLoader(loadingManager);
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(0, 0, 0.55);
        model.rotation.y = Math.PI;
        model.scale.set(1, 1, 1);
        scene.add(model);
        signalLoaded();
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const ratio = xhr.total > 0 ? xhr.loaded / xhr.total : 0;
          onAssetsProgress?.({ itemsLoaded: xhr.loaded, itemsTotal: xhr.total, ratio });
        }
      },
      (error) => {
        console.error('Error loading model:', error);
        onAssetsError?.(error);
      }
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
    const onClick = () => {
      if (enableGyroRef.current) return;
      controls.lock();
    };
    renderer.domElement.addEventListener("click", onClick);
    controlsRef.current = controls;

    // --- Animate ---
    let stop = false;
    const animate = () => {
      if (stop) return;
      const target = targetPositionRef.current;
      if (cameraRef.current && target) {
        const desired = new THREE.Vector3(target[0], target[1], target[2]);
        cameraRef.current.position.lerp(desired, 0.08);
        if (!enableGyroRef.current && !controlsRef.current?.isLocked) {
          cameraRef.current.lookAt(0, 3.3, -4);
        }
      }
      if (enableGyroRef.current) {
        gyroControlsRef.current?.update();
      }
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      stop = true;
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      scene.clear();
      cameraRef.current = null;
      controlsRef.current = null;
      gyroControlsRef.current?.disconnect();
      gyroControlsRef.current = null;
    };
  }, [
    videoStream,
    modelUrl,
    isHost,
    width,
    height,
    enableGyro,
    onAssetsLoaded,
    onAssetsProgress,
    onAssetsError,
  ]);

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    targetPositionRef.current = initialCameraPosition;
  }, [initialCameraPosition]);

  useEffect(() => {
    if (!enableGyro) {
      gyroControlsRef.current?.disconnect();
      gyroControlsRef.current = null;
      return;
    }
    const camera = cameraRef.current;
    if (!camera) return;
    const gyroControls = new DeviceOrientationControls(camera);
    gyroControls.connect();
    gyroControlsRef.current = gyroControls;
    return () => {
      gyroControls.disconnect();
      if (gyroControlsRef.current === gyroControls) {
        gyroControlsRef.current = null;
      }
    };
  }, [enableGyro]);


  return (
    <div className="relative w-full h-full flex items-center justify-center bg-none">
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />
      <div className="absolute bottom-4 text-white text-sm opacity-80">
        {enableGyro ? "Move phone to look around" : "Click to look around (Esc to exit)"}
      </div>
    </div>
  );
}

export default CinemaVideo;
