import { AnimationMixer, Box3, Group, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import type { AnimationAction, Material, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Controller supplies speed; model loading, bones and animation remain here. */
export class PlayerVisual {
  readonly root = new Group();
  readonly ready: Promise<void>;
  loaded = false;
  loadError: string | null = null;
  animationState: 'Idle' | 'Walk' | 'Run' = 'Idle';
  private mixer?: AnimationMixer;
  private model?: Group;
  private actions = new Map<string, AnimationAction>();
  private disposed = false;
  private rightHand = new Object3D();
  private leftHand = new Object3D();
  private chest = new Object3D();
  private leftFoot = new Object3D();
  private rightFoot = new Object3D();
  constructor() {
    this.rightHand.position.set(-0.28, 1.0, 0); this.leftHand.position.set(0.28, 1.0, 0);
    this.chest.position.set(0, 1.3, 0);
    this.leftFoot.position.set(.1,.025,0); this.rightFoot.position.set(-.1,.025,0);
    this.root.add(this.rightHand, this.leftHand, this.chest, this.leftFoot, this.rightFoot);
    this.ready = typeof window === 'undefined' ? Promise.resolve() : this.load();
  }
  private async load(): Promise<void> {
    try {
      const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/casual-male.glb`);
      if (this.disposed) { this.releaseModel(gltf.scene); return; }
      const model = gltf.scene;
      // Source faces +Z; gameplay forward is -Z.
      model.rotation.y = Math.PI; model.updateMatrixWorld(true);
      const box = new Box3().setFromObject(model);
      model.scale.multiplyScalar(1.82 / box.getSize(new Vector3()).y);
      model.updateMatrixWorld(true); box.setFromObject(model);
      const center = box.getCenter(new Vector3());
      model.position.set(-center.x, -box.min.y + 0.025, -center.z);
      model.traverse(object => {
        if (!(object instanceof Mesh)) return;
        object.castShadow = true; object.receiveShadow = true;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!(material instanceof MeshStandardMaterial)) continue;
          material.metalness = 0; material.roughness = 0.85;
          if (material.name.includes('opacity')) { material.alphaTest = 0.45; material.transparent = false; material.depthWrite = true; }
        }
      });
      this.model = model; this.root.add(model);
      this.rightHand = model.getObjectByName('Bip01_R_Hand') ?? model.getObjectByName('Bip01 R Hand') ?? this.rightHand;
      this.leftHand = model.getObjectByName('Bip01_L_Hand') ?? model.getObjectByName('Bip01 L Hand') ?? this.leftHand;
      this.chest = model.getObjectByName('Bip01_Spine2') ?? model.getObjectByName('Bip01 Spine2') ?? this.chest;
      this.leftFoot = model.getObjectByName('Bip01_L_Foot') ?? model.getObjectByName('Bip01 L Foot') ?? this.leftFoot;
      this.rightFoot = model.getObjectByName('Bip01_R_Foot') ?? model.getObjectByName('Bip01 R Foot') ?? this.rightFoot;
      this.mixer = new AnimationMixer(model);
      for (const clip of gltf.animations) this.actions.set(clip.name, this.mixer.clipAction(clip));
      this.actions.get('Idle')?.play(); this.loaded = true;
    } catch (error) {
      if (this.disposed) return;
      this.loadError = error instanceof Error ? error.message : String(error);
      console.error('Local human character failed to load:', error);
    }
  }
  update(_phase: number, speed: number, delta: number): void {
    if (!this.mixer) return;
    const next = speed < 0.18 ? 'Idle' : speed > 6 ? 'Run' : 'Walk';
    if (next !== this.animationState) {
      const previous = this.actions.get(this.animationState); const action = this.actions.get(next);
      if (action) { action.reset().setEffectiveWeight(1).play(); previous ? action.crossFadeFrom(previous, 0.22, false) : action.fadeIn(0.22); }
      this.animationState = next;
    }
    const action = this.actions.get(this.animationState);
    if (action) action.timeScale = next === 'Idle' ? 1 : Math.max(0.65, Math.min(1.6, speed / (next === 'Run' ? 7 : 3.6)));
    this.mixer.update(delta);
  }
  getRightHandWorldPosition(result = new Vector3()): Vector3 { this.root.updateWorldMatrix(true, true); return this.rightHand.getWorldPosition(result); }
  getLeftHandWorldPosition(result = new Vector3()): Vector3 { this.root.updateWorldMatrix(true, true); return this.leftHand.getWorldPosition(result); }
  getChestWorldPosition(result = new Vector3()): Vector3 { this.root.updateWorldMatrix(true, true); return this.chest.getWorldPosition(result); }
  getFootWorldPosition(side: 'left'|'right', result = new Vector3()): Vector3 { this.root.updateWorldMatrix(true,true); return (side==='left'?this.leftFoot:this.rightFoot).getWorldPosition(result); }
  private releaseModel(model: Group): void {
    const geometries = new Set<Mesh['geometry']>(); const materials = new Set<Material>(); const textures = new Set<Texture>();
    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value && typeof value === 'object' && 'isTexture' in value) textures.add(value as Texture);
      }
      if ('skeleton' in object) (object as import('three').SkinnedMesh).skeleton.dispose();
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose()); model.removeFromParent();
  }
  dispose(): void {
    this.disposed = true; this.mixer?.stopAllAction();
    if (this.model) { this.mixer?.uncacheRoot(this.model); this.releaseModel(this.model); }
    this.actions.clear(); this.root.removeFromParent();
  }
}
