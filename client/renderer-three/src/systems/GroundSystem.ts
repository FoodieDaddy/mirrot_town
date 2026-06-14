import * as THREE from 'three';

export class GroundSystem {
  private scene: THREE.Scene;
  private gridHelper: THREE.GridHelper;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Grass Plane with vertex color variation for natural look
    const planeGeom = new THREE.PlaneGeometry(64, 64, 48, 48);

    // Add subtle height variation
    const positions = planeGeom.attributes.position;
    const vertexCount = positions.count;
    const colors = new Float32Array(vertexCount * 3);

    const baseColor = new THREE.Color(0x7da85e); // Muted natural grass

    for (let i = 0; i < vertexCount; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      // Height variation
      const noise =
        Math.sin(x * 0.3) * Math.cos(y * 0.4) * 0.03 + Math.sin(x * 0.7 + y * 0.5) * 0.015;
      positions.setZ(i, noise);

      // Color variation - patches of lighter/darker green
      const colorNoise = Math.sin(x * 0.4) * Math.cos(y * 0.3) * 0.5 + 0.5;
      const variation = 0.85 + colorNoise * 0.15;
      colors[i * 3] = baseColor.r * variation;
      colors[i * 3 + 1] = baseColor.g * variation;
      colors[i * 3 + 2] = baseColor.b * (variation * 0.95);
    }

    planeGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    planeGeom.computeVertexNormals();

    const planeMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      depthWrite: true,
    });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.05;
    plane.receiveShadow = true;
    this.scene.add(plane);

    // 2. Grid - OFF by default, press G to toggle
    this.gridHelper = new THREE.GridHelper(64, 64, 0x000000, 0x000000);
    this.gridHelper.material.opacity = 0.02;
    this.gridHelper.material.transparent = true;
    this.gridHelper.position.y = 0;
    this.gridHelper.visible = false;
    this.scene.add(this.gridHelper);

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'g') {
        this.gridHelper.visible = !this.gridHelper.visible;
      }
    });
  }
}
