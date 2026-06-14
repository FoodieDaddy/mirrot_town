import type { EntityFactory } from './EntityFactory.js';
import { TownPathSystem } from '../systems/TownPathSystem.js';
import type * as THREE from 'three';

export class MapLoader {
    private factory: EntityFactory;
    private scene: THREE.Scene;
    private pathSystem: TownPathSystem;

    constructor(factory: EntityFactory, scene: THREE.Scene) {
        this.factory = factory;
        this.scene = scene;
        this.pathSystem = new TownPathSystem(scene);
    }

    async load(url: string): Promise<any> {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load map ${url}`);
        const mapData = await res.json();
        
        console.log('Populating map...');
        
        // Ensure npcSpawns and resourceNodes are included!
        const entityArrays = [
            { arr: mapData.buildings, type: 'building' },
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

        // Special handling for roads/paths
        if (mapData.roads) {
            for (const road of mapData.roads) {
                if (road.kind) {
                    this.pathSystem.createPath(road);
                } else {
                    // Fallback to factory if no kind (old style)
                    const entity = this.factory.createEntity(road, 'road');
                    this.scene.add(entity);
                }
            }
        }

        return mapData;
    }
}
