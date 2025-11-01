// ThreeCinema.tsx
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Props = {
  gLTFUrl: string; // path/URL to your GLTF
  videoElement?: HTMLVideoElement | null; // viewer's video element (srcObject set)
};

export default function ThreeCinema({ gLTFUrl, videoElement }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number | null>(null);

    useEffect(() => {
        if (!mountRef.current) return;
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;

        // Scene, camera, renderer setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.set(0, 1.6, 3);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        mountRef.current.appendChild(renderer.domElement);

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dir = new THREE.DirectionalLight(0xffffff, 0.3);
        dir.position.set(5, 10, 7);
        scene.add(dir);

        // Orbit controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1.6, 0);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false;
        controls.maxPolarAngle = Math.PI / 2;

        // GLTF + video texture setup
        const loader = new GLTFLoader();
        let videoTexture: THREE.VideoTexture | null = null;

        loader.load(
            gLTFUrl,
            (gltf: any) => {
            scene.add(gltf.scene);

            let screenMesh =
                gltf.scene.getObjectByName("screen") as THREE.Mesh | undefined;

            // ✅ If no mesh named 'screen', create our own fallback square
            if (!screenMesh) {
                console.warn("No mesh named 'screen' found — adding manual square mesh.");

                const geometry = new THREE.PlaneGeometry(2, 1.125); // 16:9 ratio
                const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
                screenMesh = new THREE.Mesh(geometry, material);

                // Position the screen roughly in front of the camera
                screenMesh.position.set(0, 1.5, -2.5);
                scene.add(screenMesh);
            }

            // Attach the video texture if available
            if (videoElement) {
                const ensureVideoReady = () => {
                if (videoElement.readyState >= 2) {
                    videoTexture = new THREE.VideoTexture(videoElement);
                    videoTexture.minFilter = THREE.LinearFilter;
                    videoTexture.magFilter = THREE.LinearFilter;
                    videoTexture.format = THREE.RGBFormat;
                    videoTexture.colorSpace = THREE.SRGBColorSpace;

                    (screenMesh!.material as THREE.MeshBasicMaterial).map = videoTexture;
                    (screenMesh!.material as THREE.MeshBasicMaterial).needsUpdate = true;

                    console.log("✅ Video texture attached to screen mesh");
                } else {
                    console.log("⏳ Waiting for video to load...");
                    videoElement.addEventListener("loadeddata", ensureVideoReady, { once: true });
                }
                };
                ensureVideoReady();
            }
            },
            undefined,
            (err: any) => console.error("GLTF load error", err)
        );

        // Animate loop
        const animate = () => {
            controls.update();
            if (videoTexture) videoTexture.needsUpdate = true; // ensure continuous update
            renderer.render(scene, camera);
            requestRef.current = requestAnimationFrame(animate);
        };
        animate();

        // Handle resize
        const onResize = () => {
            if (!mountRef.current) return;
            const w = mountRef.current.clientWidth;
            const h = mountRef.current.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("resize", onResize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            renderer.dispose();
            controls.dispose();
            if (videoTexture) videoTexture.dispose();
            mountRef.current?.removeChild(renderer.domElement);
        };
        }, [gLTFUrl, videoElement]);


  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
