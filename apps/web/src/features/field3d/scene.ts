/**
 * Procedural low-poly venue scenes in plain three.js (no React), so the same
 * builder feeds the interactive viewer and the offline poster renderer.
 * Units are metres. Nothing here downloads a texture or a model.
 */
import { createRng, pitchSize, type Sport, type Surface } from "@pitchkh/shared";
import * as THREE from "three";

export type TimeOfDay = "day" | "dusk" | "night";
export type SceneQuality = "low" | "high";

export interface FieldSceneOptions {
  sport: Sport;
  surface: Surface;
  indoor: boolean;
  /** "5v5" | "7v7" | "11v11" | ... */
  format: string;
  seed?: number;
  quality?: SceneQuality;
  time?: TimeOfDay;
  /** Palms, clubhouse and apron around the field. */
  surroundings?: boolean;
}

export interface FieldScene {
  root: THREE.Group;
  /** Half-diagonal of the playing area: use it to place the camera. */
  radius: number;
  background: THREE.Color;
  dispose: () => void;
}

const SURFACES: Record<Surface, { base: number; stripe: number; apron: number; line: number }> = {
  artificial_turf: { base: 0x2f9e58, stripe: 0x2a9050, apron: 0x1f7a44, line: 0xffffff },
  natural_grass: { base: 0x4faa52, stripe: 0x439a48, apron: 0x3d8f45, line: 0xffffff },
  futsal_court: { base: 0x2f78b4, stripe: 0x2f78b4, apron: 0xc8643a, line: 0xffffff },
  sand: { base: 0xe6d2a2, stripe: 0xe0ca96, apron: 0xd9c38e, line: 0x1f5fb8 },
  hard_court: { base: 0x2f6fb7, stripe: 0x2f6fb7, apron: 0x2e8b57, line: 0xffffff },
  clay: { base: 0xc9653b, stripe: 0xc25e36, apron: 0xb45530, line: 0xffffff },
  parquet: { base: 0xdcae6c, stripe: 0xd3a25f, apron: 0xb9854a, line: 0xffffff },
};

const SKIES: Record<TimeOfDay, { top: number; horizon: number; ground: number; sun: number; sunIntensity: number; ambient: number; sunPos: [number, number, number] }> = {
  day: { top: 0x4fa3e0, horizon: 0xcfe6f2, ground: 0xb9b3a3, sun: 0xfff3d6, sunIntensity: 2.6, ambient: 1.25, sunPos: [0.6, 1, 0.45] },
  dusk: { top: 0x1c2f55, horizon: 0xf2925a, ground: 0x8c7a6a, sun: 0xff9a5c, sunIntensity: 1.5, ambient: 0.75, sunPos: [-1, 0.28, 0.5] },
  night: { top: 0x050b18, horizon: 0x16263f, ground: 0x2a2f33, sun: 0x8fb0ff, sunIntensity: 0.35, ambient: 0.4, sunPos: [0.4, 1, -0.6] },
};

/** Real playing-area size, shared with the 2D pitch map. */
export const fieldDimensions = pitchSize;

export function buildFieldScene(options: FieldSceneOptions): FieldScene {
  const { sport, surface, indoor, format } = options;
  const quality = options.quality ?? "high";
  const time = options.time ?? "day";
  const high = quality === "high";
  const rng = createRng(options.seed ?? 7);
  const palette = SURFACES[surface];
  const sky = SKIES[time];
  const lit = time !== "day";
  const { length: L, width: W } = fieldDimensions(sport, format);
  const radius = Math.hypot(L, W) / 2;
  const margin = sport === "football" ? Math.max(2, L * 0.05) : sport === "tennis" ? 5.5 : 4;

  const root = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const materials = new Map<string, THREE.Material>();

  const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}): THREE.Material => {
    const key = `${color}:${JSON.stringify(extra)}`;
    let material = materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, flatShading: true, ...extra });
      materials.set(key, material);
      disposables.push(material);
    }
    return material;
  };
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, shadow: "cast" | "receive" | "both" | "none" = "cast"): THREE.Mesh => {
    disposables.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = high && (shadow === "cast" || shadow === "both");
    mesh.receiveShadow = high && (shadow === "receive" || shadow === "both");
    root.add(mesh);
    return mesh;
  };
  const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, shadow: "cast" | "receive" | "both" | "none" = "cast"): THREE.Mesh => add(new THREE.BoxGeometry(w, h, d), material, x, y, z, shadow);

  /* ------------------------------- ground ------------------------------- */
  const apronMat = mat(palette.apron);
  const surround = options.surroundings !== false;
  if (surround) {
    const ground = add(new THREE.CircleGeometry(radius * 4.2, high ? 48 : 24), mat(sky.ground), 0, -0.06, 0, "receive");
    ground.rotation.x = -Math.PI / 2;
  }
  box(L + margin * 2, 0.1, W + margin * 2, apronMat, 0, -0.05, 0, "receive");

  // Playing surface, mown in stripes where the surface has them.
  const stripes = palette.base === palette.stripe ? 1 : sport === "football" ? (L > 60 ? 12 : 8) : 6;
  for (let i = 0; i < stripes; i++) {
    const w = L / stripes;
    box(w, 0.04, W, mat(i % 2 ? palette.stripe : palette.base), -L / 2 + w * (i + 0.5), 0.02, 0, "receive");
  }

  /* -------------------------------- lines -------------------------------- */
  const lineMat = mat(palette.line, { roughness: 0.6, emissive: palette.line, emissiveIntensity: lit ? 0.25 : 0.05 });
  const t = Math.max(0.09, L * 0.0042);
  const LY = 0.05;
  const hline = (x1: number, x2: number, z: number): void => void box(Math.abs(x2 - x1) + t, 0.02, t, lineMat, (x1 + x2) / 2, LY, z, "none");
  const vline = (x: number, z1: number, z2: number): void => void box(t, 0.02, Math.abs(z2 - z1) + t, lineMat, x, LY, (z1 + z2) / 2, "none");
  const rect = (x1: number, z1: number, x2: number, z2: number): void => {
    hline(x1, x2, z1);
    hline(x1, x2, z2);
    vline(x1, z1, z2);
    vline(x2, z1, z2);
  };
  const arc = (cx: number, cz: number, r: number, start: number, len: number): void => {
    const ring = add(new THREE.RingGeometry(r - t / 2, r + t / 2, high ? 48 : 24, 1, start, len), lineMat, cx, LY, cz, "none");
    ring.rotation.x = -Math.PI / 2;
  };
  const postMat = mat(0xf4f6f4, { roughness: 0.5 });
  const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.55 });
  disposables.push(netMat);
  const cyl = (r: number, h: number, material: THREE.Material, x: number, z: number, y = h / 2): THREE.Mesh => add(new THREE.CylinderGeometry(r, r, h, 8), material, x, y, z);

  rect(-L / 2, -W / 2, L / 2, W / 2);

  if (sport === "football") {
    vline(0, -W / 2, W / 2);
    arc(0, 0, W * 0.14, 0, Math.PI * 2);
    const spot = add(new THREE.CircleGeometry(t * 1.6, 12), lineMat, 0, LY, 0, "none");
    spot.rotation.x = -Math.PI / 2;
    const small = format.startsWith("5");
    const goalW = small ? 3 : format.startsWith("7") ? 5 : 7.32;
    const goalH = format.startsWith("11") ? 2.44 : 2;
    for (const side of [-1, 1]) {
      const gx = (side * L) / 2;
      if (small) {
        arc(gx, 0, W * 0.3, side === -1 ? -Math.PI / 2 : Math.PI / 2, Math.PI);
      } else {
        const depth = L * 0.165;
        rect(gx, -W * 0.3, gx - side * depth, W * 0.3);
        rect(gx, -W * 0.14, gx - side * L * 0.055, W * 0.14);
        arc(gx - side * depth * 0.68, 0, W * 0.14, side === -1 ? -0.93 : Math.PI - 0.93, 1.86);
      }
      // Goal: two posts, a crossbar and a wireframe net.
      const pr = Math.max(0.06, L * 0.0016);
      cyl(pr, goalH, postMat, gx, -goalW / 2);
      cyl(pr, goalH, postMat, gx, goalW / 2);
      box(pr * 2, pr * 2, goalW + pr * 2, postMat, gx, goalH, 0);
      const depth = goalH * 0.6;
      add(new THREE.BoxGeometry(depth, goalH, goalW, 3, 4, Math.round(goalW * 1.5)), netMat, gx + (side * depth) / 2, goalH / 2, 0, "none");
      // Corner arcs.
      for (const cz of [-1, 1]) arc(gx, (cz * W) / 2, 1, side === -1 ? (cz === -1 ? -Math.PI / 2 : 0) : cz === -1 ? Math.PI : Math.PI / 2, Math.PI / 2);
    }
  } else if (sport === "volleyball") {
    vline(0, -W / 2, W / 2);
    if (surface !== "sand") {
      vline(-3, -W / 2, W / 2);
      vline(3, -W / 2, W / 2);
    }
    const postZ = W / 2 + 0.9;
    cyl(0.07, 2.55, postMat, 0, -postZ);
    cyl(0.07, 2.55, postMat, 0, postZ);
    const net = add(new THREE.PlaneGeometry(postZ * 2, 1, 18, 4), netMat, 0, 1.93, 0, "none");
    net.rotation.y = Math.PI / 2;
    box(0.05, 0.08, postZ * 2, postMat, 0, 2.43, 0, "none");
    box(0.05, 0.06, postZ * 2, postMat, 0, 1.43, 0, "none");
    // Referee stand.
    box(0.7, 1.6, 0.7, mat(0x24323a), 0, 0.8, -postZ - 0.9);
    box(0.9, 0.08, 0.9, mat(0xc2242b), 0, 1.64, -postZ - 0.9);
  } else {
    const singles = W / 2 - 1.37;
    hline(-L / 2, L / 2, -singles);
    hline(-L / 2, L / 2, singles);
    vline(-6.4, -singles, singles);
    vline(6.4, -singles, singles);
    hline(-6.4, 6.4, 0);
    hline(-L / 2, -L / 2 + 0.3, 0);
    hline(L / 2 - 0.3, L / 2, 0);
    const postZ = W / 2 + 0.91;
    cyl(0.06, 1.07, mat(0x24323a), 0, -postZ);
    cyl(0.06, 1.07, mat(0x24323a), 0, postZ);
    const net = add(new THREE.PlaneGeometry(postZ * 2, 0.95, 24, 4), netMat, 0, 0.5, 0, "none");
    net.rotation.y = Math.PI / 2;
    box(0.05, 0.07, postZ * 2, postMat, 0, 1, 0, "none");
    // Umpire chair.
    box(0.6, 1.8, 0.6, mat(0x24323a), 0, 0.9, -postZ - 1.1);
    box(0.8, 0.08, 0.8, mat(0x0a7446), 0, 1.84, -postZ - 1.1);
  }

  /* --------------------------------- ball --------------------------------- */
  const ballR = sport === "tennis" ? 0.22 : Math.max(0.3, L * 0.011);
  const ballColor = sport === "football" ? 0xffffff : sport === "volleyball" ? 0xffd23f : 0xd8f23a;
  const ball = add(new THREE.IcosahedronGeometry(ballR, 1), mat(ballColor, { roughness: 0.45 }), sport === "football" ? 0 : L * 0.22, ballR + 0.04, sport === "football" ? 0 : W * 0.18, "cast");
  ball.name = "ball";

  /* --------------------------- fence, lights, roof --------------------------- */
  const steel = mat(0x56636b, { roughness: 0.6, metalness: 0.3 });
  const halfL = L / 2 + margin;
  const halfW = W / 2 + margin;
  const fenceH = sport === "tennis" ? 3 : sport === "volleyball" ? 2.5 : Math.min(8, 4 + L * 0.03);

  if (!indoor && surround && surface !== "sand") {
    const fenceMat = new THREE.MeshBasicMaterial({ color: lit ? 0x9fb4c4 : 0x24323a, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    disposables.push(fenceMat);
    const span = Math.max(5, L / 8);
    for (let x = -halfL; x <= halfL + 0.01; x += (halfL * 2) / Math.round((halfL * 2) / span)) for (const z of [-halfW, halfW]) cyl(0.07, fenceH, steel, x, z);
    for (let z = -halfW; z <= halfW + 0.01; z += (halfW * 2) / Math.round((halfW * 2) / span)) for (const x of [-halfL, halfL]) cyl(0.07, fenceH, steel, x, z);
    for (const z of [-halfW, halfW]) add(new THREE.PlaneGeometry(halfL * 2, fenceH), fenceMat, 0, fenceH / 2, z, "none");
    for (const x of [-halfL, halfL]) add(new THREE.PlaneGeometry(halfW * 2, fenceH), fenceMat, x, fenceH / 2, 0, "none").rotation.y = Math.PI / 2;
  }

  const lampMat = mat(0xfff7da, { emissive: 0xfff2c4, emissiveIntensity: lit ? 3.2 : 0.4 });
  if (!indoor) {
    const poleH = sport === "football" ? Math.min(16, 8 + L * 0.08) : 7;
    const xs = L > 60 ? [-halfL, 0, halfL] : [-halfL, halfL];
    for (const x of xs) {
      for (const z of [-halfW - 0.6, halfW + 0.6]) {
        cyl(0.12, poleH, steel, x, z);
        const head = box(1.6, 0.5, 0.5, lampMat, x, poleH + 0.2, z, "none");
        head.lookAt(0, 0, 0);
        if (lit && high) {
          const spot = new THREE.SpotLight(0xfff0cf, 900 * (radius / 30), radius * 3.2, 0.75, 0.7, 1.6);
          spot.position.set(x, poleH, z);
          spot.target.position.set(x * 0.25, 0, z * 0.1);
          root.add(spot, spot.target);
        }
      }
    }
  } else {
    // Open-sided hall: columns, gable trusses and a translucent roof so the court stays visible.
    const eave = sport === "football" ? 7 : 6.5;
    const ridge = eave + Math.min(4, W * 0.14);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xdfe6ea, transparent: true, opacity: 0.2, side: THREE.DoubleSide, roughness: 0.4, depthWrite: false });
    disposables.push(roofMat);
    const bays = Math.max(3, Math.round((halfL * 2) / 7));
    const slope = Math.hypot(halfW, ridge - eave);
    const angle = Math.atan2(ridge - eave, halfW);
    for (let i = 0; i <= bays; i++) {
      const x = -halfL + (i * halfL * 2) / bays;
      for (const side of [-1, 1]) {
        cyl(0.16, eave, steel, x, side * halfW);
        const rafter = box(0.18, 0.28, slope, steel, x, (eave + ridge) / 2, (side * halfW) / 2);
        rafter.rotation.x = side * angle;
        if (lit || high) box(0.9, 0.12, 0.35, lampMat, x, eave - 0.2, side * halfW * 0.45, "none");
      }
    }
    for (const side of [-1, 1]) {
      const panel = add(new THREE.PlaneGeometry(halfL * 2, slope), roofMat, 0, (eave + ridge) / 2 + 0.2, (side * halfW) / 2, "none");
      panel.rotation.x = -Math.PI / 2 + side * angle;
      box(halfL * 2, 0.2, 0.2, steel, 0, eave, side * halfW);
    }
    box(halfL * 2, 0.24, 0.24, steel, 0, ridge, 0);
    if (high) {
      const fill = new THREE.PointLight(0xfff3d6, 260 * (radius / 20), radius * 4, 1.4);
      fill.position.set(0, eave - 0.5, 0);
      root.add(fill);
    }
  }

  /* ------------------------------ surroundings ------------------------------ */
  if (surround) {
    // Clubhouse with a krama-red awning.
    const cw = Math.max(8, L * 0.22);
    const cz = -halfW - 5.5;
    box(cw, 3.2, 4.5, mat(0xf1ece0), -L * 0.18, 1.6, cz);
    box(cw + 0.6, 0.25, 5.4, mat(0x3a4a52), -L * 0.18, 3.3, cz);
    const awning = box(cw * 0.9, 0.12, 2.2, mat(0xc2242b), -L * 0.18, 2.55, cz + 3);
    awning.rotation.x = 0.22;
    box(1.1, 2.1, 0.1, mat(0x24323a), -L * 0.18, 1.05, cz + 2.27, "none");
    // Team benches.
    for (const x of [-L * 0.2, L * 0.2]) {
      box(Math.max(3, L * 0.09), 0.12, 0.6, mat(0x1a5fb4), x, 0.5, halfW + 1.4);
      box(Math.max(3, L * 0.09), 0.5, 0.1, steel, x, 0.25, halfW + 1.4);
    }
    // Sugar palms: tall thin trunk, round fan crown.
    const trunk = mat(0x6b5a45);
    const crowns = [mat(0x2f7d46), mat(0x3a8c4f), mat(0x276b3c)];
    const palms = high ? 9 + Math.floor(rng() * 5) : 5;
    for (let i = 0; i < palms; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = radius * (1.25 + rng() * 0.9) + margin + 6;
      const x = Math.cos(angle) * dist * 1.1;
      const z = Math.sin(angle) * dist * 0.85;
      if (Math.abs(x) < halfL + 3 && Math.abs(z) < halfW + 9) continue;
      const h = 9 + rng() * 7;
      const stem = add(new THREE.CylinderGeometry(0.18, 0.3, h, 6), trunk, x, h / 2, z);
      stem.rotation.z = (rng() - 0.5) * 0.12;
      const crown = add(new THREE.IcosahedronGeometry(2.2 + rng() * 0.9, 0), crowns[i % crowns.length] as THREE.Material, x, h + 0.9, z);
      crown.scale.y = 0.72;
    }
    // A few low buildings on the horizon give the city-edge feel.
    if (high) {
      for (let i = 0; i < 7; i++) {
        const angle = Math.PI * (1.05 + i * 0.13) + rng() * 0.1;
        const dist = radius * 3 + 20 + rng() * 14;
        const h = 6 + rng() * 16;
        const b = box(8 + rng() * 8, h, 8 + rng() * 6, mat(lit ? 0x2b3a4a : 0xd9d4c8), Math.cos(angle) * dist, h / 2, Math.sin(angle) * dist);
        b.rotation.y = rng();
      }
    }
  }

  /* --------------------------------- sky --------------------------------- */
  const top = new THREE.Color(sky.top);
  const horizon = new THREE.Color(sky.horizon);
  const domeGeometry = new THREE.SphereGeometry(radius * 14, 24, 12);
  const position = domeGeometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const mixed = new THREE.Color();
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i) / (radius * 14);
    mixed.copy(horizon).lerp(top, Math.min(1, Math.max(0, y * 1.9)) ** 0.7);
    colors.set([mixed.r, mixed.g, mixed.b], i * 3);
  }
  domeGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  disposables.push(domeGeometry, domeMat);
  const dome = new THREE.Mesh(domeGeometry, domeMat);
  dome.renderOrder = -1;
  root.add(dome);

  /* -------------------------------- lights -------------------------------- */
  root.add(new THREE.HemisphereLight(sky.top, sky.ground, sky.ambient * (lit && !high ? 1.9 : 1)));
  const sun = new THREE.DirectionalLight(sky.sun, sky.sunIntensity);
  sun.position.set(sky.sunPos[0] * radius * 2, sky.sunPos[1] * radius * 2, sky.sunPos[2] * radius * 2);
  if (high) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const reach = radius * 1.7;
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: radius * 6 });
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.05;
  }
  root.add(sun);

  return {
    root,
    radius,
    background: horizon,
    dispose: () => {
      for (const item of disposables) item.dispose();
    },
  };
}

/** Where to put the camera for a pleasing three-quarter view. */
export function defaultCameraPosition(radius: number, azimuth = 0.62, elevation = 0.5): [number, number, number] {
  const distance = radius * 2.15 + 6;
  return [Math.sin(azimuth) * Math.cos(elevation) * distance, Math.sin(elevation) * distance, Math.cos(azimuth) * Math.cos(elevation) * distance];
}
