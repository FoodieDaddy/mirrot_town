import * as THREE from 'three';

export class GroundSystem {
    private scene: THREE.Scene;
    private gridHelper: THREE.GridHelper;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        // 1. Grass Plane
        const planeGeom = new THREE.PlaneGeometry(64, 64);
        const planeMat = new THREE.MeshLambertMaterial({ 
            color: 0x6e9f65, // stylized grass green
            depthWrite: true 
        });
        const plane = new THREE.Mesh(planeGeom, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -0.02; // slightly below 0 to avoid z-fighting with flat roads
        plane.receiveShadow = true;
        this.scene.add(plane);

        // 2. Debug Grid
        this.gridHelper = new THREE.GridHelper(64, 64, 0x000000, 0x000000);
        this.gridHelper.material.opacity = 0.08;
        this.gridHelper.material.transparent = true;
        this.gridHelper.position.y = 0;
        this.scene.add(this.gridHelper);

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'g') {
                this.gridHelper.visible = !this.gridHelper.visible;
            }
        });
    }
}
