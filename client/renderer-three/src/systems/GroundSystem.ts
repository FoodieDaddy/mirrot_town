import * as THREE from 'three';

export class GroundSystem {
    private scene: THREE.Scene;
    private gridHelper: THREE.GridHelper;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        // 1. Grass Plane (Brighter stylized green)
        const planeGeom = new THREE.PlaneGeometry(64, 64);
        const planeMat = new THREE.MeshLambertMaterial({ 
            color: 0x88c070, // Brighter grass green
            depthWrite: true 
        });
        const plane = new THREE.Mesh(planeGeom, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.05; // further down to avoid z-fighting
        plane.receiveShadow = true;
        this.scene.add(plane);

        // 2. Subtle Grid
        this.gridHelper = new THREE.GridHelper(64, 64, 0x000000, 0x000000);
        this.gridHelper.material.opacity = 0.015; // Even more subtle
        this.gridHelper.material.transparent = true;
        this.gridHelper.position.y = 0;
        this.gridHelper.visible = false; // Off by default
        this.scene.add(this.gridHelper);

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'g') {
                this.gridHelper.visible = !this.gridHelper.visible;
            }
        });
    }
}
