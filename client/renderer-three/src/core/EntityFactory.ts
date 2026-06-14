import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AssetRegistry } from './AssetRegistry.js';

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
            if (type === 'character') {
                // Use SkeletonUtils to correctly clone skinned meshes and bones
                clone = SkeletonUtils.clone(model);
                clone.scale.set(0.5, 0.5, 0.5);
                // Also copy animations over manually as SkeletonUtils doesn't clone userdata deeply
                if (model.userData && model.userData.animations) {
                    clone.userData.animations = model.userData.animations;
                }
            } else {
                clone = model.clone();
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
