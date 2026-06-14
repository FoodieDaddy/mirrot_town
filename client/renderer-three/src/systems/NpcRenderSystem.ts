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

    scene.children.forEach((child) => {
      if (child.userData.type === 'character') {
        this.registerInstance(child.userData.id, child);
      }
    });
  }

  private registerInstance(id: string, instance: THREE.Object3D) {
    this.instances.set(id, instance);

    let anims: THREE.AnimationClip[] | undefined;
    instance.traverse((c) => {
      if (c.userData.animations) anims = c.userData.animations;
    });

    if (anims && anims.length > 0) {
      const mixer = new THREE.AnimationMixer(instance);
      mixer.clipAction(anims[0]).play();
      this.mixers.push(mixer);
      instance.userData.mixer = mixer;
      instance.userData.anims = anims;
    }

    // Add Label - smaller, more transparent, better positioned
    const name = instance.userData.name || instance.userData.displayName || id;
    const isPlayer = instance.userData.assetId === 'npc_player_001';
    const div = document.createElement('div');
    div.className = 'npc-label';
    div.textContent = name;
    div.style.fontSize = isPlayer ? '12px' : '10px';
    div.style.padding = isPlayer ? '2px 8px' : '1px 5px';
    div.style.backgroundColor = isPlayer ? 'rgba(60, 120, 200, 0.5)' : 'rgba(0, 0, 0, 0.3)';
    div.style.borderRadius = '3px';
    div.style.whiteSpace = 'nowrap';
    div.style.pointerEvents = 'auto';
    div.style.cursor = 'pointer';
    if (isPlayer) {
      div.style.border = '1px solid rgba(100, 180, 255, 0.4)';
    }

    const label = new CSS2DObject(div);
    const box = new THREE.Box3().setFromObject(instance);
    const height = box.max.y - box.min.y;
    label.position.set(0, height + 0.3, 0);
    instance.add(label);
    instance.userData.label = label;
  }

  public update(delta: number) {
    for (const mixer of this.mixers) {
      mixer.update(delta);
    }
    this.preventLabelOverlaps();
  }

  private preventLabelOverlaps() {
    // Collect all label positions in screen space
    const labels: { element: HTMLElement; screenPos: THREE.Vector2; offset: number }[] = [];

    this.instances.forEach((instance) => {
      const label = instance.userData.label;
      if (!label) return;

      const element = label.element as HTMLElement;
      if (!element) return;

      // Get world position of label
      const worldPos = new THREE.Vector3();
      label.getWorldPosition(worldPos);

      // Simple distance-based offset for close NPCs
      labels.push({
        element,
        screenPos: new THREE.Vector2(instance.position.x, instance.position.z),
        offset: 0,
      });
    });

    // Apply staggered Y offsets for NPCs that are too close (< 3 units)
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const dist = labels[i].screenPos.distanceTo(labels[j].screenPos);
        if (dist < 3.0) {
          labels[j].offset += 0.25;
          labels[i].element.style.transform = `translateY(${-labels[i].offset * 20}px)`;
          labels[j].element.style.transform = `translateY(${-labels[j].offset * 20}px)`;
        }
      }
    }
  }

  public sync(state: WorldState) {
    if (!state || !state.characters) return;

    state.characters.forEach((charState, charId) => {
      let instance = this.instances.get(charId);

      if (!instance) {
        instance = this.factory.createEntity(
          {
            id: charId,
            assetId: 'npc_base_001',
            name: charState.name,
            position: { x: charState.transform.x - 20, y: 0, z: charState.transform.y - 20 },
          },
          'character'
        );
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
