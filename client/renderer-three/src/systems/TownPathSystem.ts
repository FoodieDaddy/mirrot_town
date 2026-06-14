import * as THREE from 'three';

export interface RoadData {
  id: string;
  kind: 'plaza_stone' | 'dirt_path' | 'stone_path' | 'grass_edge';
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  width?: number;
  depth?: number;
}

// Seeded random for consistent tile variation
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class TownPathSystem {
  private scene: THREE.Scene;
  private tileCounter = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createPath(data: RoadData): THREE.Object3D {
    const width = data.width || 2.0;
    const depth = data.depth || 2.0;

    let color = 0x888888;
    let opacity = 0.9;

    if (data.kind === 'dirt_path') {
      color = 0x9b8365; // warmer brown dirt
      opacity = 0.85;
    } else if (data.kind === 'plaza_stone') {
      // Slight color variation per tile for natural stone look
      const variation = seededRandom(data.position.x * 13 + data.position.z * 7);
      const r = 0.7 + variation * 0.06;
      const g = 0.68 + variation * 0.04;
      const b = 0.6 + variation * 0.05;
      color = new THREE.Color(r, g, b).getHex();
      opacity = 0.95;
    } else if (data.kind === 'stone_path') {
      color = 0x999988; // muted gray
      opacity = 0.9;
    } else if (data.kind === 'grass_edge') {
      color = 0x7a9e5e; // grass green
      opacity = 0.7;
    }

    const geom = new THREE.PlaneGeometry(width, depth);
    const mat = new THREE.MeshLambertMaterial({
      color,
      transparent: true,
      opacity,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = -Math.PI / 2;
    // Plaza tiles slightly lower to avoid z-fighting with props
    const yOffset = data.kind === 'plaza_stone' ? 0.005 : 0.01;
    mesh.position.set(data.position.x, yOffset, data.position.z);

    if (data.rotation) {
      mesh.rotation.z = -data.rotation.y;
    }

    mesh.receiveShadow = true;
    mesh.userData = { id: data.id, type: 'road', kind: data.kind };
    this.scene.add(mesh);
    this.tileCounter++;
    return mesh;
  }
}
