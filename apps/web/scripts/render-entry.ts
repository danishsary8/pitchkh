// Bundled by render-assets.mjs and run inside headless Chromium to turn the
// procedural scenes into poster images and GLB models.
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildFieldScene, defaultCameraPosition, type FieldSceneOptions } from "../src/features/field3d/scene";

interface RenderJob extends FieldSceneOptions {
  width: number;
  height: number;
  azimuth?: number;
  elevation?: number;
  fov?: number;
  /** Multiplies the camera distance: < 1 moves closer. */
  zoom?: number;
  lookAt?: [number, number, number];
}

declare global {
  interface Window {
    renderScene: (job: RenderJob) => string;
    exportGlb: (job: FieldSceneOptions, only?: string) => Promise<string>;
  }
}

let renderer: THREE.WebGLRenderer | null = null;

window.renderScene = (job) => {
  renderer ??= new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(job.width, job.height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = job.time === "night" ? 1.25 : 1.05;

  const built = buildFieldScene({ quality: "high", ...job });
  const scene = new THREE.Scene();
  scene.background = built.background;
  scene.fog = new THREE.Fog(built.background, built.radius * 4, built.radius * 13);
  scene.add(built.root);

  const camera = new THREE.PerspectiveCamera(job.fov ?? 38, job.width / job.height, 0.5, built.radius * 40);
  const [x, y, z] = defaultCameraPosition(built.radius, job.azimuth, job.elevation);
  const zoom = job.zoom ?? 1;
  camera.position.set(x * zoom, y * zoom, z * zoom);
  camera.lookAt(...(job.lookAt ?? [0, 0, 0]));
  renderer.render(scene, camera);
  const data = renderer.domElement.toDataURL("image/webp", 0.84);
  built.dispose();
  return data;
};

window.exportGlb = async (job, only) => {
  const built = buildFieldScene({ quality: "low", surroundings: false, ...job });
  let target: THREE.Object3D = built.root;
  // Lights, the sky dome and wireframe nets do not belong in a reusable model file.
  const drop: THREE.Object3D[] = [];
  built.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if ((o as THREE.Light).isLight || (mesh.isMesh && ((mesh.material as THREE.Material).side === THREE.BackSide || (mesh.material as THREE.MeshBasicMaterial).wireframe))) drop.push(o);
  });
  for (const o of drop) o.removeFromParent();
  if (only) target = built.root.getObjectByName(only) ?? built.root;
  const buffer = (await new GLTFExporter().parseAsync(target, { binary: true })) as ArrayBuffer;
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};
