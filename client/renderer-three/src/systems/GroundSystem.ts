import * as THREE from 'three';

export class GroundSystem {
    private scene: THREE.Scene;
    private gridHelper: THREE.GridHelper;

    constructor(scene: THREE.Scene) {
        this.scene = scene;

        // 1. Grass Plane - Natural grass green with subtle variation
        const planeGeom = new THREE.PlaneGeometry(64, 64, 32, 32);
        
        // Add subtle height variation for natural look
        const positions = planeGeom.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            // Subtle noise-like variation (fixed seed behavior via math)
            const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.02;
            positions.setZ(i, noise);
        }
        planeGeom.computeVertexNormals();
        
        const planeMat = new THREE.MeshLambertMaterial({ 
            color: 0x82b36a, // Natural grass green (slightly muted)
            depthWrite: true 
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
