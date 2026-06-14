import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface AssetDefinition {
  id: string;
  type: string;
  path: string;
  tags?: string[];
  roof?: { hideable: boolean; roofNodeName: string };
}

export class AssetRegistry {
  public manifest: any = {};
  private cache = new Map<string, THREE.Group>();
  private loader = new GLTFLoader();
  public failedAssets: Array<{ assetId: string; path: string; error: string }> = [];

  async loadManifest(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load manifest from ${url}`);
    this.manifest = await res.json();
  }

  async preloadAssets() {
    if (!this.manifest.assets) return;

    const promises = this.manifest.assets.map((assetDef: AssetDefinition) => {
      return new Promise<void>((resolve) => {
        this.loader.load(
          assetDef.path,
          (gltf) => {
            gltf.scene.userData.animations = gltf.animations;
            this.cache.set(assetDef.id, gltf.scene);
            resolve();
          },
          undefined,
          (error: any) => {
            console.warn(
              `WARNING: Failed to load asset ${assetDef.id} from ${assetDef.path}`,
              error
            );
            this.failedAssets.push({
              assetId: assetDef.id,
              path: assetDef.path,
              error: error.message || String(error),
            });
            resolve(); // Resolve anyway, we handle missing models in Factory
          }
        );
      });
    });

    await Promise.all(promises);

    if (this.failedAssets.length > 0) {
      console.error('--- Failed to load the following assets ---');
      this.failedAssets.forEach((fail) => {
        console.error(`ID: ${fail.assetId} | Path: ${fail.path} | Error: ${fail.error}`);
      });
      console.error('-------------------------------------------');
    } else {
      console.log('All available assets loaded successfully.');
    }
  }

  getModel(assetId: string): THREE.Group | undefined {
    return this.cache.get(assetId);
  }

  getDefinition(assetId: string): AssetDefinition | undefined {
    return this.manifest.assets?.find((a: any) => a.id === assetId);
  }
}
