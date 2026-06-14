import type { EntityFactory } from './EntityFactory.js';
import type * as THREE from 'three';

export class MapLoader {
    private factory: EntityFactory;
    private scene: THREE.Scene;

    constructor(factory: EntityFactory, scene: THREE.Scene) {
        this.factory = factory;
        this.scene = scene;
    }

    async load(url: string): Promise<any> {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load map ${url}`);
        const mapData = await res.json();
        
        console.log('Populating map...');
        
        // Ensure npcSpawns and resourceNodes are included!
        const entityArrays = [
            { arr: mapData.buildings, type: 'building' },
            { arr: mapData.roads, type: 'road' },
            { arr: mapData.props, type: 'prop' },
            { arr: mapData.nature, type: 'nature' },
            { arr: mapData.resourceNodes, type: 'resourceNode' },
            { arr: mapData.npcSpawns, type: 'character' }
        ];

        for (const { arr, type } of entityArrays) {
            if (!arr) continue;
            for (const entityData of arr) {
                const entity = this.factory.createEntity(entityData, type);
                this.scene.add(entity);
            }
        }

        return mapData;
    }
}
