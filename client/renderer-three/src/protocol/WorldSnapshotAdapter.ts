import type { Scene } from 'three';
import type { WorldSnapshot } from '@jingzhong-biancheng/shared';

export class WorldSnapshotAdapter {
    private scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public applySnapshot(snapshot: WorldSnapshot) {
        console.log('Applying snapshot to Three.js scene', this.scene.type, snapshot.worldId);
        // Implementation will parse snapshot.buildings, snapshot.characters etc.
        // and instantiate corresponding GLB models in the scene.
    }
}
