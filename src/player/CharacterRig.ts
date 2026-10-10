import { Object3D, Quaternion, Vector3 } from 'three';
/** Single restore → mixer → capture → additive pass. No accumulated bone offsets. */
export class CharacterRig {
  readonly bones = new Map<string, Object3D>();
  private readonly poses: {bone:Object3D;rotation:Quaternion;position:Vector3;scale:Vector3}[] = [];
  constructor(readonly model: Object3D) {
    model.traverse(o=>{if ('isBone' in o && o.isBone) {this.bones.set(o.name.replaceAll(' ','_'),o);this.poses.push({bone:o,rotation:o.quaternion.clone(),position:o.position.clone(),scale:o.scale.clone()});}});
  }
  bone(name:string):Object3D|undefined {return this.bones.get(`Bip01_${name}`);}
  capture():void {for(const p of this.poses){p.rotation.copy(p.bone.quaternion);p.position.copy(p.bone.position);p.scale.copy(p.bone.scale);}}
  restore():void {for(const p of this.poses){p.bone.quaternion.copy(p.rotation);p.bone.position.copy(p.position);p.bone.scale.copy(p.scale);}}
  /** Rotate in world axes, converting back into the bone's parent frame. */
  rotateWorld(bone:Object3D,axis:Vector3,angle:number):void {
    bone.getWorldQuaternion(this.world);this.delta.setFromAxisAngle(axis,angle);this.world.premultiply(this.delta);
    bone.parent?.getWorldQuaternion(this.parent);this.parent.invert();bone.quaternion.copy(this.parent.multiply(this.world));bone.updateWorldMatrix(false,true);
  }
  private readonly world=new Quaternion();private readonly parent=new Quaternion();private readonly delta=new Quaternion();
}
