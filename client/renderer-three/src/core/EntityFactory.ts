import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { AssetRegistry } from './AssetRegistry.js';
import { ASSET_SCALE_PROFILE } from './AssetScaleProfile.js';

export class EntityFactory {
    private registry: AssetRegistry;
    public placeholderCount = 0;

    constructor(registry: AssetRegistry) {
        this.registry = registry;
    }

    createEntity(entityData: any, type: string): THREE.Object3D {
        const assetId = entityData.assetId;
        const model = this.registry.getModel(assetId);
        
        let clone: THREE.Object3D;

        if (model) {
            if (type === 'character') {
                clone = SkeletonUtils.clone(model);
                if (model.userData && model.userData.animations) {
                    clone.userData.animations = model.userData.animations;
                }
            } else {
                clone = model.clone();
            }

            // Normalization
            const profile = (ASSET_SCALE_PROFILE as any)[type] || { defaultScale: 1, maxHeight: 5 };
            
            // Calculate real bounding box
            const box = new THREE.Box3().setFromObject(clone);
            const size = box.getSize(new THREE.Vector3());
            
            // Adjust scale to fit max height
            let scaleFactor = profile.defaultScale;
            if (entityData.scale && entityData.scale <= 3) {
                scaleFactor *= entityData.scale;
            }

            const currentHeight = size.y * scaleFactor;
            if (currentHeight > profile.maxHeight) {
                scaleFactor = scaleFactor * (profile.maxHeight / currentHeight);
                console.log(`[Scale Normalization] ${assetId}: height ${currentHeight.toFixed(2)} exceeds ${profile.maxHeight}, scaling down to ${scaleFactor.toFixed(2)}`);
            }

            clone.scale.set(scaleFactor, scaleFactor, scaleFactor);

            // Recompute box after scale
            const finalBox = new THREE.Box3().setFromObject(clone);
            const minY = finalBox.min.y;
            
            // Snap to ground (min.y should touch 0)
            const yOffset = clone.position.y - minY;
            
            if (entityData.position) {
                clone.position.set(entityData.position.x, entityData.position.y + yOffset, entityData.position.z);
            } else {
                clone.position.set(0, yOffset, 0);
            }

        } else {
            console.warn(`Model not found for ${assetId}, creating placeholder.`);
            this.placeholderCount++;
            if (type === 'character') {
                const geom = new THREE.CapsuleGeometry(0.3, 1, 4, 8);
                const mat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
                clone = new THREE.Mesh(geom, mat);
                clone.position.y = 0.8;
            } else {
                const geom = new THREE.BoxGeometry(1, 1, 1);
                const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
                clone = new THREE.Mesh(geom, mat);
                clone.position.y = 0.5;
            }
            
            const group = new THREE.Group();
            group.add(clone);
            clone = group;

            if (entityData.position) {
                clone.position.set(entityData.position.x, entityData.position.y, entityData.position.z);
            }
        }

        if (entityData.rotation) {
            // Apply rotation around the center
            clone.rotation.set(entityData.rotation.x, entityData.rotation.y, entityData.rotation.z);
        }

        clone.userData = { 
            id: entityData.id || `temp_${Math.random()}`, 
            name: entityData.name || entityData.displayName,
            displayName: entityData.displayName || entityData.name,
            type, 
            assetId 
        };

        return clone;
    }
}
