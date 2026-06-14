import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { WorldStateStore, type WorldState } from '@jingzhong-biancheng/client-core';

// Setup basic Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color('#8cae88');

const aspect = window.innerWidth / window.innerHeight;
const d = 20;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);

camera.position.set(20, 20, 20);
camera.lookAt(scene.position);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('app')?.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = true;
controls.maxPolarAngle = Math.PI / 2;
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

const gltfLoader = new GLTFLoader();
const assetCache = new Map<string, THREE.Group>();
let assetManifest: any = {};
let mapData: any = {};

// Animation and State Management
const mixers: THREE.AnimationMixer[] = [];
const characterMixers = new Map<string, THREE.AnimationMixer>();
const npcInstances = new Map<string, THREE.Object3D>();
const clock = new THREE.Clock();

const store = new WorldStateStore();
const socket = new WebSocket(`ws://localhost:3000/ws/worlds/default`);

socket.onopen = () => {
    console.log('WebSocket connected');
    socket.send(JSON.stringify({
        type: 'viewer_join',
        worldId: 'default',
        clientSeq: 0,
        payload: { clientVersion: '0.1.0', platform: 'web' }
    }));
};

socket.onmessage = (event) => {
    try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'world_snapshot') {
            store.applySnapshot(msg.payload);
            syncWorldState(store.getState());
        } else if (msg.type === 'world_delta') {
            store.applyDelta(msg.payload);
            syncWorldState(store.getState());
        }
    } catch(e) {
        console.error('Error parsing message', e);
    }
};

async function init() {
    try {
        console.log('Loading manifests and map...');
        const manifestRes = await fetch('/assets/manifest/asset-manifest.json');
        if (!manifestRes.ok) throw new Error('Could not load asset-manifest.json');
        assetManifest = await manifestRes.json();

        const mapRes = await fetch('/maps/qtown_v0_1.json');
        if (!mapRes.ok) throw new Error('Could not load qtown_v0_1.json');
        mapData = await mapRes.json();

        const w = mapData.size?.width || 64;
        const gridHelper = new THREE.GridHelper(w, w, 0x000000, 0x000000);
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);

        await loadAssets();
        populateMap();
    } catch (e) {
        console.error('Initialization error:', e);
    }
}

async function loadAssets() {
    const promises = assetManifest.assets.map((assetDef: any) => {
        return new Promise<void>((resolve) => {
            gltfLoader.load(
                assetDef.path,
                (gltf) => {
                    // Attach animations to userdata so we can use them later
                    gltf.scene.userData.animations = gltf.animations;
                    assetCache.set(assetDef.id, gltf.scene);
                    resolve();
                },
                undefined,
                (error) => {
                    console.warn(`WARNING: Failed to load asset ${assetDef.id} from ${assetDef.path}`, error);
                    const geometry = new THREE.BoxGeometry(1, 1, 1);
                    const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
                    const placeholder = new THREE.Mesh(geometry, material);
                    const group = new THREE.Group();
                    group.add(placeholder);
                    assetCache.set(assetDef.id, group);
                    resolve();
                }
            );
        });
    });
    await Promise.all(promises);
    console.log('All assets loaded.');
}

function instantiateEntity(entity: any, type: string) {
    const assetId = entity.assetId;
    const model = assetCache.get(assetId);
    if (!model) {
        console.warn(`Model not found in cache for ${assetId}`);
        return;
    }

    const clone = model.clone();
    
    // Scale adjustment based on model source. Kaykit characters might need scaling.
    if (type === 'character') {
        clone.scale.set(0.5, 0.5, 0.5); // Adjust as needed
    }

    if (entity.position) {
        clone.position.set(entity.position.x, entity.position.y, entity.position.z);
    }
    if (entity.rotation) {
        clone.rotation.set(entity.rotation.x, entity.rotation.y, entity.rotation.z);
    }

    clone.userData = { id: entity.id, type, assetId };
    
    if (type === 'character') {
        npcInstances.set(entity.id, clone);
        if (model.userData.animations && model.userData.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(clone);
            // Default play first animation (usually idle)
            mixer.clipAction(model.userData.animations[0]).play();
            characterMixers.set(entity.id, mixer);
            mixers.push(mixer);
        }
    }
    
    scene.add(clone);
}

function populateMap() {
    console.log('Populating map...');
    const allEntities = [
        ...(mapData.buildings || []).map((e: any) => ({...e, type: 'building'})),
        ...(mapData.roads || []).map((e: any) => ({...e, type: 'road'})),
        ...(mapData.props || []).map((e: any) => ({...e, type: 'prop'})),
        ...(mapData.nature || []).map((e: any) => ({...e, type: 'nature'}))
    ];

    for (const entity of allEntities) {
        instantiateEntity(entity, entity.type);
    }
}

function syncWorldState(state: WorldState) {
    // Sync character positions and states
    const characters = state.characters;
    characters.forEach((charState, charId) => {
        let instance = npcInstances.get(charId);
        
        if (!instance) {
            // If character spawned dynamically that isn't in mapData yet, instantiate it
            // Assuming npc_base_001 as fallback
            instantiateEntity({ id: charId, assetId: 'npc_base_001', position: { x: charState.transform.x - 20, y: 0, z: charState.transform.y - 20 } }, 'character');
            instance = npcInstances.get(charId);
        }

        if (instance) {
            // Update position (adjust coords mapping. Server x,y might map to x,z in ThreeJS)
            // Server coordinates are 0-40. Map is centered at 0,0.
            const targetX = charState.transform.x - 20; 
            const targetZ = charState.transform.y - 20;
            
            // Basic lerp or immediate jump
            instance.position.x = targetX;
            instance.position.z = targetZ;

            // Handle direction/rotation based on server state
            const dir = (charState.state as any)?.direction;
            if (dir === 'left') instance.rotation.y = -Math.PI / 2;
            else if (dir === 'right') instance.rotation.y = Math.PI / 2;
            else if (dir === 'up') instance.rotation.y = Math.PI;
            else if (dir === 'down') instance.rotation.y = 0;
            
            // Animation state
            const isMoving = (charState.state as any)?.isMoving;
            const mixer = characterMixers.get(charId);
            if (mixer && instance.userData.assetId) {
                const model = assetCache.get(instance.userData.assetId);
                const anims = model?.userData.animations;
                if (anims && anims.length > 1) {
                    // Very rudimentary animation selection (assumes 0 is idle, 1 is walk if Kaykit)
                    // You'll need specific mapping based on the actual GLB animation names
                    const targetAnimIndex = isMoving ? 1 : 0;
                    if (targetAnimIndex < anims.length) {
                        const targetClip = anims[targetAnimIndex];
                        // Only transition if not currently playing this exact clip
                        // A proper setup requires tracking active action
                        mixer.stopAllAction();
                        mixer.clipAction(targetClip).play();
                    }
                }
            }
        }
    });
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        let object = intersects[0].object;
        while (object.parent && object.parent.type !== 'Scene') {
            if (object.userData && object.userData.type === 'building') break;
            object = object.parent;
        }

        if (object.userData && object.userData.type === 'building') {
            const assetDef = assetManifest.assets.find((a: any) => a.id === object.userData.assetId);
            if (assetDef && assetDef.roof && assetDef.roof.hideable) {
                let roofHidden = false;
                object.traverse((child) => {
                    if (child.name.toLowerCase().includes('roof')) {
                        child.visible = !child.visible;
                        roofHidden = true;
                    }
                });
                if (roofHidden) {
                    console.log('Toggled roof visibility');
                }
            }
        }
    }
});

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    mixers.forEach(m => m.update(delta));
    controls.update();
    renderer.render(scene, camera);
}

init().then(() => {
    animate();
});

window.addEventListener('resize', () => {
    const newAspect = window.innerWidth / window.innerHeight;
    camera.left = -d * newAspect;
    camera.right = d * newAspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});