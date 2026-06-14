import * as THREE from 'three';
import type { WorldState } from '@jingzhong-biancheng/client-core';
import type { EntityFactory } from '../core/EntityFactory.js';

export class NpcRenderSystem {
    private scene: THREE.Scene;
    private factory: EntityFactory;
    private mixers: THREE.AnimationMixer[] = [];
    private instances = new Map<string, THREE.Object3D>();

    constructor(scene: THREE.Scene, factory: EntityFactory) {
        this.scene = scene;
        this.factory = factory;
        
        // Register existing map spawned npcs
        scene.children.forEach(child => {
            if (child.userData.type === 'character') {
                this.registerInstance(child.userData.id, child);
            }
        });
    }

    private registerInstance(id: string, instance: THREE.Object3D) {
        this.instances.set(id, instance);
        
        // Find if any root has animations (cached by AssetRegistry)
        let anims: THREE.AnimationClip[] | undefined;
        instance.traverse(c => {
            if (c.userData && c.userData.animations) anims = c.userData.animations;
        });

        if (anims && anims.length > 0) {
            const mixer = new THREE.AnimationMixer(instance);
            mixer.clipAction(anims[0]).play();
            this.mixers.push(mixer);
            instance.userData.mixer = mixer;
            instance.userData.anims = anims;
        }
    }

    public update(delta: number) {
        for (const mixer of this.mixers) {
            mixer.update(delta);
        }
    }

    public sync(state: WorldState) {
        if (!state || !state.characters) {
            return;
        }

        state.characters.forEach((charState, charId) => {
            let instance = this.instances.get(charId);
            
            if (!instance) {
                // Spawn dynamically
                instance = this.factory.createEntity({ 
                    id: charId, 
                    assetId: 'npc_base_001', 
                    position: { x: charState.transform.x - 20, y: 0, z: charState.transform.y - 20 } 
                }, 'character');
                this.scene.add(instance);
                this.registerInstance(charId, instance);
            }

            // Sync position
            const targetX = charState.transform.x - 20; 
            const targetZ = charState.transform.y - 20;
            instance.position.x = targetX;
            instance.position.z = targetZ;

            // Sync direction
            const dir = (charState.state as any)?.direction;
            if (dir === 'left') instance.rotation.y = -Math.PI / 2;
            else if (dir === 'right') instance.rotation.y = Math.PI / 2;
            else if (dir === 'up') instance.rotation.y = Math.PI;
            else if (dir === 'down') instance.rotation.y = 0;

            // Animation
            const isMoving = (charState.state as any)?.isMoving;
            const mixer = instance.userData.mixer as THREE.AnimationMixer | undefined;
            const anims = instance.userData.anims as THREE.AnimationClip[] | undefined;
            
            if (mixer && anims && anims.length > 1) {
                const targetAnimIndex = isMoving ? 1 : 0; // Simple assume 1=walk, 0=idle
                if (targetAnimIndex < anims.length) {
                    // Try to avoid restarting the same animation if it's already playing
                    // A simple check is to look at existing actions
                    // For this simple demo, we just stop all and play
                    mixer.stopAllAction();
                    mixer.clipAction(anims[targetAnimIndex]).play();
                }
            }
        });
    }
}
