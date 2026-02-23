import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DeviceOrientationControls, GLTFLoader, PointerLockControls } from "three-stdlib";

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
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const screenRef = useRef<THREE.Mesh | null>(null);
  const animationRef = useRef<number | null>(null);
  const targetPositionRef = useRef<[number, number, number]>(initialCameraPosition);
  const enableGyroRef = useRef(enableGyro);
  const controlsRef = useRef<PointerLockControls | null>(null);
  const gyroControlsRef = useRef<DeviceOrientationControls | null>(null);
  const onAssetsLoadedRef = useRef(onAssetsLoaded);
  const onAssetsProgressRef = useRef(onAssetsProgress);
  const onAssetsErrorRef = useRef(onAssetsError);

  useEffect(() => {
    enableGyroRef.current = enableGyro;
  }, [enableGyro]);

  useEffect(() => {
    onAssetsLoadedRef.current = onAssetsLoaded;
    onAssetsProgressRef.current = onAssetsProgress;
    onAssetsErrorRef.current = onAssetsError;
  }, [onAssetsLoaded, onAssetsProgress, onAssetsError]);

  useEffect(() => {
    if (!mountRef.current) return;

    let didSignalLoaded = false;
    const signalLoaded = () => {
      if (didSignalLoaded) return;
      didSignalLoaded = true;
      onAssetsLoadedRef.current?.();
    };

    const video = videoRef.current ?? document.createElement("video");
    videoRef.current = video;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.playsInline = true;
    video.muted = isHost;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07060a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(...initialCameraPosition);
    camera.lookAt(0, 3.3, -4);
    cameraRef.current = camera;
    targetPositionRef.current = initialCameraPosition;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    rendererRef.current = renderer;

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.1);
    directional.position.set(5, 10, 5);
    scene.add(directional);

    const screenLight = new THREE.PointLight(0xffffff, 1.2, 20);
    screenLight.position.set(0, 3.3, -4.2);
    scene.add(screenLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x080608, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const loadingManager = new THREE.LoadingManager();
    loadingManager.onLoad = () => signalLoaded();
    loadingManager.onProgress = (_url, itemsLoaded, itemsTotal) => {
      const ratio = itemsTotal > 0 ? itemsLoaded / itemsTotal : 0;
      onAssetsProgressRef.current?.({ itemsLoaded, itemsTotal, ratio });
    };
    loadingManager.onError = (url) => {
      onAssetsErrorRef.current?.(new Error(`Failed to load asset: ${url}`));
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
          onAssetsProgressRef.current?.({ itemsLoaded: xhr.loaded, itemsTotal: xhr.total, ratio });
        }
      },
      (error) => {
        onAssetsErrorRef.current?.(error);
      }
    );

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTextureRef.current = videoTexture;

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 6.5),
      new THREE.MeshBasicMaterial({ map: videoTexture })
    );
    screen.position.set(0, 3.3, -4);
    scene.add(screen);
    screenRef.current = screen;

    const controls = new PointerLockControls(camera, renderer.domElement);
    const onClick = () => {
      if (enableGyroRef.current) return;
      controls.lock();
    };
    renderer.domElement.addEventListener("click", onClick);
    controlsRef.current = controls;

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
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      stop = true;
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      scene.clear();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      cameraRef.current = null;
      controlsRef.current = null;
      gyroControlsRef.current?.disconnect();
      gyroControlsRef.current = null;
      videoTextureRef.current?.dispose();
      videoTextureRef.current = null;
      screenRef.current = null;
      sceneRef.current = null;
      rendererRef.current = null;
    };
  }, [modelUrl]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!renderer || !camera) return;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }, [width, height]);

  useEffect(() => {
    targetPositionRef.current = initialCameraPosition;
  }, [initialCameraPosition]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playSafe = () => {
      video.play().catch(() => undefined);
    };

    video.muted = isHost;

    if (videoStream) {
      video.srcObject = videoStream;
      video.onloadedmetadata = playSafe;
      return;
    }

    const elementSrcObject = videoElement?.srcObject as MediaStream | null;
    if (elementSrcObject) {
      video.srcObject = elementSrcObject;
      video.onloadedmetadata = playSafe;
      return;
    }

    const elementSrc = videoElement?.currentSrc || videoElement?.src;
    if (elementSrc) {
      video.srcObject = null;
      video.src = elementSrc;
      playSafe();
      return;
    }

    video.srcObject = null;
    video.src = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
    playSafe();
  }, [videoStream, videoElement, isHost]);

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
};

export default CinemaVideo;
