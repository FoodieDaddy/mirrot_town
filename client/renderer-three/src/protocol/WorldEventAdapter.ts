import type { Scene } from 'three';
import type { WorldDelta } from '@jingzhong-biancheng/shared';

export class WorldEventAdapter {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public applyDelta(delta: WorldDelta) {
        console.log('Applying delta events to update scene state', this.scene.type, delta.type);
        // e.g. character moved, roof hidden, animation changed
    }
}
