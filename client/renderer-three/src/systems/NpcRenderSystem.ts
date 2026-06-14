import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { WorldEvent, NpcState, Vec3 } from '@jingzhong-biancheng/shared';
import type { EntityFactory } from '../core/EntityFactory.js';

interface NpcInstance {
  object3D: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  anims: THREE.AnimationClip[] | null;
  label: CSS2DObject;
  // Interpolation state
  currentPosition: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
  moveSpeed: number; // units per second
  status: NpcState['status'];
}

const MOVE_SPEED = 2.5; // units per second

export class NpcRenderSystem {
  private scene: THREE.Scene;
  private factory: EntityFactory;
  private mixers: THREE.AnimationMixer[] = [];
  private instances = new Map<string, NpcInstance>();

  constructor(scene: THREE.Scene, factory: EntityFactory) {
    this.scene = scene;
    this.factory = factory;

    // Register existing character instances from map load
    scene.children.forEach((child) => {
      if (child.userData.type === 'character') {
        this.registerInstance(child.userData.id, child);
      }
    });
  }

  private registerInstance(id: string, instance: THREE.Object3D) {
    let anims: THREE.AnimationClip[] | undefined;
    instance.traverse((c) => {
      if (c.userData.animations) anims = c.userData.animations;
    });

    let mixer: THREE.AnimationMixer | null = null;
    if (anims && anims.length > 0) {
      mixer = new THREE.AnimationMixer(instance);
      mixer.clipAction(anims[0]).play();
      this.mixers.push(mixer);
    }

    // Add Label
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

    const npcInstance: NpcInstance = {
      object3D: instance,
      mixer,
      anims: anims ?? null,
      label,
      currentPosition: instance.position.clone(),
      targetPosition: null,
      moveSpeed: MOVE_SPEED,
      status: 'idle',
    };

    this.instances.set(id, npcInstance);
    instance.userData.label = label;
    instance.userData.mixer = mixer;
    instance.userData.anims = anims;
  }

  /**
   * Apply snapshot NPC states — create/update NPCs from the server snapshot.
   */
  applySnapshotNpcs(npcs: NpcState[]): void {
    for (const npcState of npcs) {
      let instance = this.instances.get(npcState.id);

      if (!instance) {
        // Create new NPC from snapshot
        const entityData = {
          id: npcState.id,
          assetId: npcState.assetId,
          name: npcState.displayName,
          displayName: npcState.displayName,
          position: { ...npcState.position },
        };
        const object3D = this.factory.createEntity(entityData, 'character');
        this.scene.add(object3D);
        this.registerInstance(npcState.id, object3D);
        instance = this.instances.get(npcState.id)!;
      }

      // Set initial position from snapshot (only if not already moving)
      if (instance.targetPosition === null) {
        instance.currentPosition.set(npcState.position.x, npcState.position.y, npcState.position.z);
        instance.object3D.position.copy(instance.currentPosition);
      }

      // Set target position if NPC is walking
      if (npcState.targetPosition && npcState.status === 'walking') {
        instance.targetPosition = new THREE.Vector3(
          npcState.targetPosition.x,
          npcState.targetPosition.y,
          npcState.targetPosition.z
        );
        instance.status = 'walking';
      }

      // Update status
      instance.status = npcState.status ?? 'idle';
    }
  }

  /**
   * Handle a WorldEvent from the WebSocket.
   */
  handleEvent(event: WorldEvent): void {
    if (event.type === 'npc_moved') {
      this.onNpcMoved(event.npcId, event);
    }
  }

  private onNpcMoved(
    npcId: string,
    event: { position: Vec3; targetPosition?: Vec3; status?: NpcState['status'] }
  ) {
    const instance = this.instances.get(npcId);
    if (!instance) return;

    // Set the starting position
    instance.currentPosition.set(event.position.x, event.position.y, event.position.z);
    instance.object3D.position.copy(instance.currentPosition);

    if (event.targetPosition) {
      instance.targetPosition = new THREE.Vector3(
        event.targetPosition.x,
        event.targetPosition.y,
        event.targetPosition.z
      );
      instance.status = event.status ?? 'walking';
    } else {
      instance.targetPosition = null;
      instance.status = event.status ?? 'idle';
    }

    // Update facing
    if (instance.targetPosition) {
      const dx = instance.targetPosition.x - instance.currentPosition.x;
      const dz = instance.targetPosition.z - instance.currentPosition.z;
      if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        instance.object3D.rotation.y = Math.atan2(dx, dz);
      }
    }
  }

  /**
   * Frame update — advance animation mixers and interpolate NPC positions.
   */
  update(delta: number) {
    // Update mixers
    for (const mixer of this.mixers) {
      mixer.update(delta);
    }

    // Interpolate NPC positions
    for (const [, instance] of this.instances) {
      if (instance.targetPosition) {
        const distance = instance.currentPosition.distanceTo(instance.targetPosition);
        const step = instance.moveSpeed * delta;

        if (distance <= step) {
          // Arrived
          instance.currentPosition.copy(instance.targetPosition);
          instance.targetPosition = null;
          instance.status = 'idle';
        } else {
          // Move towards target
          const direction = new THREE.Vector3()
            .subVectors(instance.targetPosition, instance.currentPosition)
            .normalize();
          instance.currentPosition.add(direction.multiplyScalar(step));
        }

        instance.object3D.position.copy(instance.currentPosition);
      }

      // Update animation based on status
      this.updateAnimation(instance);
    }

    this.preventLabelOverlaps();
  }

  private updateAnimation(instance: NpcInstance): void {
    const { mixer, anims, status } = instance;
    if (!mixer || !anims || anims.length < 2) return;

    const targetAnimIndex = status === 'walking' ? 1 : 0;
    if (targetAnimIndex < anims.length) {
      const action = mixer.clipAction(anims[targetAnimIndex]);
      if (!action.isRunning()) {
        mixer.stopAllAction();
        action.play();
      }
    }
  }

  private preventLabelOverlaps() {
    const labels: { element: HTMLElement; screenPos: THREE.Vector2; offset: number }[] = [];

    this.instances.forEach((instance) => {
      const label = instance.label;
      if (!label) return;

      const element = label.element as HTMLElement;
      if (!element) return;

      labels.push({
        element,
        screenPos: new THREE.Vector2(instance.object3D.position.x, instance.object3D.position.z),
        offset: 0,
      });
    });

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

  /**
   * Legacy sync method — kept for backward compatibility with WorldStateStore.
   */
  sync(state: any) {
    if (!state || !state.characters) return;

    state.characters.forEach((charState: any, charId: string) => {
      let instance = this.instances.get(charId);

      if (!instance) {
        const obj = this.factory.createEntity(
          {
            id: charId,
            assetId: 'npc_base_001',
            name: charState.name,
            position: { x: charState.transform.x - 20, y: 0, z: charState.transform.y - 20 },
          },
          'character'
        );
        this.scene.add(obj);
        this.registerInstance(charId, obj);
        instance = this.instances.get(charId)!;
      }

      const targetX = charState.transform.x - 20;
      const targetZ = charState.transform.y - 20;
      instance.currentPosition.set(targetX, 0, targetZ);
      instance.object3D.position.copy(instance.currentPosition);

      const dir = charState.state?.direction;
      if (dir === 'left') instance.object3D.rotation.y = -Math.PI / 2;
      else if (dir === 'right') instance.object3D.rotation.y = Math.PI / 2;
      else if (dir === 'up') instance.object3D.rotation.y = Math.PI;
      else if (dir === 'down') instance.object3D.rotation.y = 0;
    });
  }

  get npcCount(): number {
    return this.instances.size;
  }
}
