import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export class RendererApp {
    public scene: THREE.Scene;
    public camera: THREE.OrthographicCamera;
    public renderer: THREE.WebGLRenderer;
    public labelRenderer: CSS2DRenderer;
    public controls: OrbitControls;
    public clock: THREE.Clock;
    private updatables: ((delta: number) => void)[] = [];

    constructor(containerId: string) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#a8c69f'); // more vibrant grass background
        this.clock = new THREE.Clock();

        const aspect = window.innerWidth / window.innerHeight;
        const d = 15; // Zoomed in a bit more
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(this.scene.position);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.getElementById(containerId)?.appendChild(this.renderer.domElement);

        // Labels
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.getElementById(containerId)?.appendChild(this.labelRenderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableRotate = true;
        this.controls.maxPolarAngle = Math.PI / 2.1; 
        this.controls.enableDamping = true;

        this.setupLights();

        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    private setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Subtle ambient
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(-10, 20, 10); // From top-left
        dirLight.castShadow = true;
        this.scene.add(dirLight);
    }

    private onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const d = 15;
        this.camera.left = -d * aspect;
        this.camera.right = d * aspect;
        this.camera.top = d;
        this.camera.bottom = -d;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
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
        this.labelRenderer.render(this.scene, this.camera);
    }
}
