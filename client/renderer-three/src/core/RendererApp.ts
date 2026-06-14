import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class RendererApp {
    public scene: THREE.Scene;
    public camera: THREE.OrthographicCamera;
    public renderer: THREE.WebGLRenderer;
    public controls: OrbitControls;
    public clock: THREE.Clock;
    private updatables: ((delta: number) => void)[] = [];

    constructor(containerId: string) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#8cae88');
        this.clock = new THREE.Clock();

        const aspect = window.innerWidth / window.innerHeight;
        const d = 20;
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(this.scene.position);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.getElementById(containerId)?.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableRotate = true;
        this.controls.maxPolarAngle = Math.PI / 2;
        this.controls.enableDamping = true;

        this.setupLights();
        this.setupGrid();

        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    private setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(20, 40, 20);
        this.scene.add(dirLight);
    }

    private setupGrid() {
        const gridHelper = new THREE.GridHelper(64, 64, 0x000000, 0x000000);
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }

    private onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const d = 20;
        this.camera.left = -d * aspect;
        this.camera.right = d * aspect;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public addUpdatable(fn: (delta: number) => void) {
        this.updatables.push(fn);
    }

    private animate() {
        requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();
        
        for (const fn of this.updatables) {
            fn(delta);
        }
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
