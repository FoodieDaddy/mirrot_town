import * as THREE from 'three';
import type { AssetRegistry } from './AssetRegistry';

export class EntityFactory {
    private registry: AssetRegistry;

    constructor(registry: AssetRegistry) {
        this.registry = registry;
    }

    createEntity(entityData: any, type: string): THREE.Object3D {
        const assetId = entityData.assetId;
        const model = this.registry.getModel(assetId);
        
        let clone: THREE.Object3D;

        if (model) {
            clone = model.clone();
            // Scale Kaykit characters
            if (type === 'character') {
                clone.scale.set(0.5, 0.5, 0.5);
            }
        } else {
            console.warn(`Model not found for ${assetId}, creating placeholder.`);
            if (type === 'character') {
                const geom = new THREE.CapsuleGeometry(0.3, 1, 4, 8);
                const mat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
                clone = new THREE.Mesh(geom, mat);
                clone.position.y = 0.8; // raise above ground
            } else {
                const geom = new THREE.BoxGeometry(1, 1, 1);
                const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
                clone = new THREE.Mesh(geom, mat);
            }
            
            const group = new THREE.Group();
            group.add(clone);
            clone = group;
        }

        if (entityData.position) {
            clone.position.set(entityData.position.x, entityData.position.y, entityData.position.z);
        }
        if (entityData.rotation) {
            clone.rotation.set(entityData.rotation.x, entityData.rotation.y, entityData.rotation.z);
        }

        clone.userData = { 
            id: entityData.id || `temp_${Math.random()}`, 
            type, 
            assetId 
        };

        return clone;
    }
}
