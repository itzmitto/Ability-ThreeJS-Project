import { Box3, Group, MathUtils, Mesh, MeshStandardMaterial, Object3D, SkinnedMesh, Vector3 } from 'three';
import type { Material, Skeleton, Texture } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GraphicsSettings } from '../quality/GraphicsSettings';
import { CharacterRig } from './CharacterRig';
import { CharacterAnimationController } from './CharacterAnimationController';
import { CharacterMaterials } from './CharacterMaterials';
import { CharacterGeometry } from './CharacterGeometry';
import { CharacterMotion } from './CharacterMotion';
import { CharacterFootIK } from './CharacterFootIK';
import { CHARACTER_CONFIG as C } from './CharacterConfig';

/** Controller supplies speed; model loading, bones and animation remain here. */
export class PlayerVisual {
  readonly root = new Group();
  readonly ready: Promise<void>;
  loaded = false;
  loadError: string | null = null;
  animationState: 'Idle' | 'Walk' | 'Run' = 'Idle';
  animation?: CharacterAnimationController;
  motion?: CharacterMotion;
  feet?: CharacterFootIK;
  private rig?: CharacterRig;
  private readonly materials=new CharacterMaterials();
  private clothing?:CharacterGeometry;
  private unsubscribe?:()=>void;
  private qualityDetail=2;
  private surface?:(x:number,z:number)=>number;
  private readonly surfacePoint=new Vector3();
  private model?: Group;
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
      model.scale.multiplyScalar(C.height / box.getSize(new Vector3()).y);
      model.updateMatrixWorld(true); box.setFromObject(model);
      const center = box.getCenter(new Vector3());
      model.position.set(-center.x, -box.min.y + 0.025, -center.z);
      model.traverse(object => {
        if (!(object instanceof Mesh)) return;
        object.castShadow = true; object.receiveShadow = true;
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!(material instanceof MeshStandardMaterial)) continue;
          this.materials.enhance(material,material.name.includes('opacity')?'hair':material.name.includes('head')?'skin':'fabric');
        }
      });
      this.model = model; this.root.add(model);
      this.rightHand = model.getObjectByName('Bip01_R_Hand') ?? model.getObjectByName('Bip01 R Hand') ?? this.rightHand;
      this.leftHand = model.getObjectByName('Bip01_L_Hand') ?? model.getObjectByName('Bip01 L Hand') ?? this.leftHand;
      this.chest = model.getObjectByName('Bip01_Spine2') ?? model.getObjectByName('Bip01 Spine2') ?? this.chest;
      this.leftFoot = model.getObjectByName('Bip01_L_Foot') ?? model.getObjectByName('Bip01 L Foot') ?? this.leftFoot;
      this.rightFoot = model.getObjectByName('Bip01_R_Foot') ?? model.getObjectByName('Bip01 R Foot') ?? this.rightFoot;
      this.clothing=new CharacterGeometry(model,this.materials);
      this.rig=new CharacterRig(model);
      this.animation=new CharacterAnimationController(model,gltf.animations,this.rig);
      this.motion=new CharacterMotion(this.rig,this.root);this.feet=new CharacterFootIK(this.rig);this.feet.enabled=this.qualityDetail>1;
      this.loaded = true;
    } catch (error) {
      if (this.disposed) return;
      this.loadError = error instanceof Error ? error.message : String(error);
      console.error('Local human character failed to load:', error);
    }
  }
  configureEnvironment(settings:GraphicsSettings,surface:(x:number,z:number)=>number):void {
    this.unsubscribe?.();this.surface=surface;
    this.unsubscribe=settings.subscribe(config=>{this.materials.setQuality(config);this.qualityDetail=config.waterDetail;if(this.feet)this.feet.enabled=config.waterDetail>1;});
  }
  update(_phase: number, speed: number, delta: number, sprint=false): void {
    if (!this.animation||!this.rig||!this.motion) return;
    delta=Number.isFinite(delta)?MathUtils.clamp(delta,0,.1):0;
    this.rig.restore();this.animation.update(delta,speed,sprint);this.rig.capture();
    this.animationState=this.animation.activeClip;
    if(this.surface){this.root.parent?.getWorldPosition(this.surfacePoint);const height=this.surface(this.surfacePoint.x,this.surfacePoint.z);if(Number.isFinite(height))this.root.position.y=MathUtils.lerp(this.root.position.y,MathUtils.clamp(height,-.35,.35),1-Math.exp(-C.surfaceFollow*delta));}
    this.root.updateWorldMatrix(true,true);this.motion.update(delta,speed,sprint);
    if(this.surface)this.feet?.update(delta,speed,this.surface,this.root.getWorldPosition(this.surfacePoint).y);
  }
  /** Optional upper-arm overlay; locomotion actions, legs, controller and player yaw remain unchanged. */
  beginRightHandCast(duration: number, elevation=.18): void {
    this.motion?.begin(duration,elevation);
  }
  onAbilityCast(id:string,direction:Vector3):void {this.motion?.ability(id,direction);}
  setAimDirection(direction:Vector3):void {this.motion?.setAim(direction);}
  getRightHandWorldPosition(result = new Vector3()): Vector3 { this.root.updateWorldMatrix(true, true); return this.rightHand.getWorldPosition(result); }
  getLeftHandWorldPosition(result = new Vector3()): Vector3 { this.root.updateWorldMatrix(true, true); return this.leftHand.getWorldPosition(result); }
  getChestWorldPosition(result = new Vector3()): Vector3 { this.root.updateWorldMatrix(true, true); return this.chest.getWorldPosition(result); }
  getFootWorldPosition(side: 'left'|'right', result = new Vector3()): Vector3 { this.root.updateWorldMatrix(true,true); return (side==='left'?this.leftFoot:this.rightFoot).getWorldPosition(result); }
  private releaseModel(model: Group): void {
    const geometries = new Set<Mesh['geometry']>(); const materials = new Set<Material>(); const textures = new Set<Texture>();const skeletons=new Set<Skeleton>();
    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value && typeof value === 'object' && 'isTexture' in value) textures.add(value as Texture);
      }
      if (object instanceof SkinnedMesh) skeletons.add(object.skeleton);
    });
    skeletons.forEach(skeleton=>skeleton.dispose());geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); textures.forEach(texture => texture.dispose()); model.removeFromParent();
  }
  dispose(): void {
    if(this.disposed)return;this.disposed = true;this.unsubscribe?.();this.unsubscribe=undefined;this.surface=undefined;
    this.animation?.dispose();this.clothing?.dispose();this.materials.dispose();
    if (this.model) this.releaseModel(this.model);
    this.animation=undefined;this.motion=undefined;this.feet=undefined;this.rig=undefined;this.root.removeFromParent();
  }
}
