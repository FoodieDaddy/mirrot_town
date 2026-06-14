import * as THREE from 'three';

export interface RoadData {
    id: string;
    kind: 'plaza_stone' | 'dirt_path' | 'stone_path';
    position: { x: number, y: number, z: number };
    rotation?: { x: number, y: number, z: number };
    width?: number;
    depth?: number;
}

export class TownPathSystem {
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public createPath(data: RoadData): THREE.Object3D {
        const width = data.width || 2.0;
        const depth = data.depth || 2.0;
        
        let color = 0x888888;
        if (data.kind === 'dirt_path') color = 0x8b7355; // brown
        else if (data.kind === 'plaza_stone') color = 0xaaaaaa; // light gray
        else if (data.kind === 'stone_path') color = 0x999999; // gray

        const geom = new THREE.PlaneGeometry(width, depth);
        const mat = new THREE.MeshLambertMaterial({ 
            color,
            transparent: true,
            opacity: 0.9
        });
        
        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(data.position.x, 0.01, data.position.z);
        
        if (data.rotation) {
            mesh.rotation.z = -data.rotation.y; // Match world rotation to plane local rotation
        }

        mesh.userData = { id: data.id, type: 'road', kind: data.kind };
        this.scene.add(mesh);
        return mesh;
    }
}
