import * as THREE from 'three';
import type { AssetRegistry } from '../core/AssetRegistry.js';

export class SelectionSystem {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private registry: AssetRegistry;
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private hoveredObject: THREE.Object3D | null = null;
    private originalEmissive = new Map<string, THREE.Color>();

    constructor(scene: THREE.Scene, camera: THREE.Camera, registry: AssetRegistry) {
        this.scene = scene;
        this.camera = camera;
        this.registry = registry;
        
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('click', this.onClick.bind(this));
        window.addEventListener('keydown', this.onKeyDown.bind(this));
    }

    private onMouseMove(event: MouseEvent) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            let object: THREE.Object3D | null = intersects[0].object;
            while (object && object.parent && object.parent.type !== 'Scene') {
                if (object.userData && (object.userData.type === 'building' || object.userData.type === 'character')) break;
                object = object.parent;
            }

            if (object !== this.hoveredObject) {
                this.unhighlight();
                if (object && (object.userData.type === 'building' || object.userData.type === 'character')) {
                    this.highlight(object);
                }
            }
        } else {
            this.unhighlight();
        }
    }

    private highlight(object: THREE.Object3D) {
        this.hoveredObject = object;
        object.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                const mat = mesh.material as THREE.MeshStandardMaterial;
                if (mat.emissive) {
                    const id = mesh.uuid;
                    if (!this.originalEmissive.has(id)) {
                        this.originalEmissive.set(id, mat.emissive.clone());
                    }
                    mat.emissive.setHex(0x222222);
                }
            }
        });
    }

    private unhighlight() {
        if (!this.hoveredObject) return;
        this.hoveredObject.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                const mat = mesh.material as THREE.MeshStandardMaterial;
                if (mat.emissive) {
                    const orig = this.originalEmissive.get(mesh.uuid);
                    if (orig) mat.emissive.copy(orig);
                }
            }
        });
        this.hoveredObject = null;
    }

    private onClick() {
        if (!this.hoveredObject) return;
        
        const data = this.hoveredObject.userData;
        const debugEl = document.getElementById('debug-selection');
        if (debugEl) {
            debugEl.innerText = `Selected: ${data.displayName || data.id} (${data.type})`;
        }

        if (data.type === 'building') {
            this.toggleRoof(this.hoveredObject);
        }
    }

    private toggleRoof(object: THREE.Object3D) {
        const assetDef = this.registry.getDefinition(object.userData.assetId);
        if (assetDef && assetDef.roof && assetDef.roof.hideable) {
            let found = false;
            object.traverse((child) => {
                if (child.name.toLowerCase().includes('roof')) {
                    child.visible = !child.visible;
                    found = true;
                }
            });
            if (!found) console.warn('Roof node not found for', object.userData.id);
        }
    }

    private onKeyDown(event: KeyboardEvent) {
        if (event.key.toLowerCase() === 'r') {
            this.cycleRoofMode();
        }
    }

    private cycleRoofMode() {
        const buildings = this.scene.children.filter(c => c.userData.type === 'building');
        // Simple global cycle: normal -> all-hidden -> normal
        // This is a placeholder for more complex mode logic.
        const firstBuilding = buildings[0];
        if (!firstBuilding) return;
        
        const isCurrentlyHidden = firstBuilding.userData.allRoofsHidden || false;
        const targetVisible = isCurrentlyHidden;

        buildings.forEach(b => {
            b.userData.allRoofsHidden = !targetVisible;
            b.traverse(child => {
                if (child.name.toLowerCase().includes('roof')) {
                    child.visible = targetVisible;
                }
            });
        });

        const debugEl = document.getElementById('debug-selection');
        if (debugEl) {
            debugEl.innerText = `Roof Mode: ${targetVisible ? 'Normal' : 'All Hidden'}`;
        }
    }
}
