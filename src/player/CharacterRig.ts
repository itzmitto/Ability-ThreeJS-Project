import { Object3D, Quaternion, Vector3 } from 'three';
const FINGER_SUFFIXES=['','1','2'] as const;
/** Single restore → mixer → capture → additive pass. No accumulated bone offsets. */
export class CharacterRig {
  readonly bones = new Map<string, Object3D>();
  private readonly rest=new Map<string,Quaternion>();
  private readonly poses: {bone:Object3D;rotation:Quaternion;position:Vector3;scale:Vector3}[] = [];
  constructor(readonly model: Object3D) {
    model.traverse(o=>{if ('isBone' in o && o.isBone) {const name=o.name.replaceAll(' ','_');this.bones.set(name,o);this.rest.set(name,o.quaternion.clone().normalize());this.poses.push({bone:o,rotation:o.quaternion.clone(),position:o.position.clone(),scale:o.scale.clone()});}});
  }
  bone(name:string):Object3D|undefined {return this.bones.get(`Bip01_${name}`);}
  openHand(side:'L'|'R',weight:number):void {for(let digit=1;digit<=4;digit++)for(const suffix of FINGER_SUFFIXES){const name=`Bip01_${side}_Finger${digit}${suffix}`,bone=this.bones.get(name),rest=this.rest.get(name);if(bone&&rest)bone.quaternion.slerp(rest,weight).normalize();}}
  capture():void {for(const p of this.poses){p.bone.quaternion.normalize();p.rotation.copy(p.bone.quaternion);p.position.copy(p.bone.position);p.scale.copy(p.bone.scale);}}
  restore():void {for(const p of this.poses){p.bone.quaternion.copy(p.rotation);p.bone.position.copy(p.position);p.bone.scale.copy(p.scale);}}
  /** Rotate in world axes, converting back into the bone's parent frame. */
  rotateWorld(bone:Object3D,axis:Vector3,angle:number):void {
    bone.getWorldQuaternion(this.world).normalize();this.delta.setFromAxisAngle(axis,angle);this.world.premultiply(this.delta);
    bone.parent?.getWorldQuaternion(this.parent);this.parent.normalize().invert();bone.quaternion.copy(this.parent.multiply(this.world)).normalize();bone.updateWorldMatrix(false,true);
  }
  private readonly world=new Quaternion();private readonly parent=new Quaternion();private readonly delta=new Quaternion();
}
