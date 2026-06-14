import * as THREE from 'three';
import type { AssetRegistry } from '../core/AssetRegistry';

export class RoofVisibilitySystem {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private registry: AssetRegistry;
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();

    constructor(scene: THREE.Scene, camera: THREE.Camera, registry: AssetRegistry) {
        this.scene = scene;
        this.camera = camera;
        this.registry = registry;
        
        window.addEventListener('click', this.onClick.bind(this));
    }

    private onClick(event: MouseEvent) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            let object: THREE.Object3D | null = intersects[0].object;
            while (object && object.parent && object.parent.type !== 'Scene') {
                if (object.userData && object.userData.type === 'building') break;
                object = object.parent;
            }

            if (object && object.userData && object.userData.type === 'building') {
                const assetDef = this.registry.getDefinition(object.userData.assetId);
                if (assetDef && assetDef.roof && assetDef.roof.hideable) {
                    let roofHidden = false;
                    object.traverse((child) => {
                        if (child.name.toLowerCase().includes('roof')) {
                            child.visible = !child.visible;
                            roofHidden = true;
                        }
                    });
                    if (!roofHidden) {
                        console.warn('Roof node not found for', object.userData.id);
                    }
                } else {
                    console.log('Roof not available or hideable=false for', assetDef?.id);
                }
            }
        }
    }
}
