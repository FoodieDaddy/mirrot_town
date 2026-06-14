import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
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
        
        scene.children.forEach(child => {
            if (child.userData.type === 'character') {
                this.registerInstance(child.userData.id, child);
            }
        });
    }

    private registerInstance(id: string, instance: THREE.Object3D) {
        this.instances.set(id, instance);
        
        let anims: THREE.AnimationClip[] | undefined;
        instance.traverse(c => {
            if (c.userData.animations) anims = c.userData.animations;
        });

        if (anims && anims.length > 0) {
            const mixer = new THREE.AnimationMixer(instance);
            mixer.clipAction(anims[0]).play();
            this.mixers.push(mixer);
            instance.userData.mixer = mixer;
            instance.userData.anims = anims;
        }

        // Add Label
        const name = instance.userData.name || instance.userData.displayName || id;
        const div = document.createElement('div');
        div.className = 'npc-label';
        div.textContent = name;
        
        const label = new CSS2DObject(div);
        // Position relative to scaled model height
        const box = new THREE.Box3().setFromObject(instance);
        const height = box.max.y - box.min.y;
        label.position.set(0, height + 0.2, 0); 
        instance.add(label);
    }

    public update(delta: number) {
        for (const mixer of this.mixers) {
            mixer.update(delta);
        }
    }

    public sync(state: WorldState) {
        if (!state || !state.characters) return;

        state.characters.forEach((charState, charId) => {
            let instance = this.instances.get(charId);
            
            if (!instance) {
                instance = this.factory.createEntity({ 
                    id: charId, 
                    assetId: 'npc_base_001', 
                    name: charState.name,
                    position: { x: charState.transform.x - 20, y: 0, z: charState.transform.y - 20 } 
                }, 'character');
                this.scene.add(instance);
                this.registerInstance(charId, instance);
            }

            const targetX = charState.transform.x - 20; 
            const targetZ = charState.transform.y - 20;
            instance.position.x = targetX;
            instance.position.z = targetZ;

            const dir = (charState.state as any)?.direction;
            if (dir === 'left') instance.rotation.y = -Math.PI / 2;
            else if (dir === 'right') instance.rotation.y = Math.PI / 2;
            else if (dir === 'up') instance.rotation.y = Math.PI;
            else if (dir === 'down') instance.rotation.y = 0;

            const isMoving = (charState.state as any)?.isMoving;
            const mixer = instance.userData.mixer as THREE.AnimationMixer | undefined;
            const anims = instance.userData.anims as THREE.AnimationClip[] | undefined;
            
            if (mixer && anims && anims.length > 1) {
                const targetAnimIndex = isMoving ? 1 : 0;
                if (targetAnimIndex < anims.length) {
                    const action = mixer.clipAction(anims[targetAnimIndex]);
                    if (!action.isRunning()) {
                        mixer.stopAllAction();
                        action.play();
                    }
                }
            }
        });
    }
}
