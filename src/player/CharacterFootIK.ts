import { MathUtils, Object3D, Quaternion, Vector3 } from 'three';
import type { CharacterRig } from './CharacterRig';
import { CHARACTER_CONFIG as C } from './CharacterConfig';
/** Analytic two-bone solver using the current bend plane. Fixed scratch storage, no frame allocations. */
export class TwoBoneCorrection {
  private readonly a=new Vector3();private readonly b=new Vector3();private readonly c=new Vector3();
  private readonly axis=new Vector3();private readonly bend=new Vector3();private readonly knee=new Vector3();
  private readonly from=new Vector3();private readonly to=new Vector3();
  private readonly delta=new Quaternion();private readonly rotation=new Quaternion();private readonly parent=new Quaternion();
  solve(upper:Object3D,lower:Object3D,end:Object3D,target:Vector3,weight=1):void {
    upper.getWorldPosition(this.a);lower.getWorldPosition(this.b);end.getWorldPosition(this.c);
    const l1=this.a.distanceTo(this.b),l2=this.b.distanceTo(this.c);if(l1<.01||l2<.01)return;
    this.axis.copy(target).sub(this.a);const distance=MathUtils.clamp(this.axis.length(),Math.abs(l1-l2)+.01,(l1+l2)*.985);this.axis.normalize();
    this.bend.copy(this.b).sub(this.a);this.bend.addScaledVector(this.axis,-this.bend.dot(this.axis));
    if(this.bend.lengthSq()<1e-8)this.bend.set(0,0,1).addScaledVector(this.axis,-this.axis.z);this.bend.normalize();
    const along=(l1*l1+distance*distance-l2*l2)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
    this.knee.copy(this.a).addScaledVector(this.axis,along).addScaledVector(this.bend,height);
    this.rotate(upper,this.from.copy(this.b).sub(this.a),this.to.copy(this.knee).sub(this.a),weight);
    lower.getWorldPosition(this.b);end.getWorldPosition(this.c);
    this.rotate(lower,this.from.copy(this.c).sub(this.b),this.to.copy(target).sub(this.b),weight);
  }
  private rotate(bone:Object3D,from:Vector3,to:Vector3,weight:number):void {
    if(from.lengthSq()<1e-9||to.lengthSq()<1e-9)return;
    this.delta.identity().slerp(this.rotation.setFromUnitVectors(from.normalize(),to.normalize()),MathUtils.clamp(weight,0,1));
    bone.getWorldQuaternion(this.rotation).normalize().premultiply(this.delta);bone.parent!.getWorldQuaternion(this.parent).normalize().invert();
    bone.quaternion.copy(this.parent.multiply(this.rotation)).normalize();bone.updateWorldMatrix(false,true);
  }
}
interface Leg {upper:Object3D;lower:Object3D;foot:Object3D;weight:number;planted:boolean;plant:Vector3;previous:Vector3;}
export class CharacterFootIK {
  readonly contacts={left:0,right:0};
  enabled=true;
  private readonly legs:Leg[]=[];private readonly solver=new TwoBoneCorrection();private readonly point=new Vector3();private readonly target=new Vector3();
  constructor(rig:CharacterRig) {
    for(const side of ['L','R']){const upper=rig.bone(`${side}_Thigh`),lower=rig.bone(`${side}_Calf`),foot=rig.bone(`${side}_Foot`);if(upper&&lower&&foot)this.legs.push({upper,lower,foot,weight:0,planted:false,plant:new Vector3(),previous:new Vector3()});}
  }
  update(delta:number,speed:number,surface:(x:number,z:number)=>number,rootY:number):void {
    for(let i=0;i<this.legs.length;i++){
      const leg=this.legs[i];leg.foot.getWorldPosition(this.point);
      // Ankle bones are about 10cm above the sole. Only correct the low stance part of the clip.
      const sole=this.point.y-.105,contact=1-MathUtils.smoothstep(sole-rootY,.035,.15);
      leg.weight=MathUtils.lerp(leg.weight,this.enabled?contact:0,1-Math.exp(-C.contactBlend*delta));
      if(contact>.7&&!leg.planted){leg.plant.copy(this.point);leg.planted=true;}if(contact<.25)leg.planted=false;
      this.target.copy(this.point);const sampled=surface(this.point.x,this.point.z);if(!Number.isFinite(sampled))continue;
      this.target.y+=MathUtils.clamp(sampled+.105-this.point.y,-C.footCorrection,C.footCorrection);
      if(leg.planted&&speed>.2){this.target.x+=MathUtils.clamp(leg.plant.x-this.point.x,-C.plantCorrection,C.plantCorrection);this.target.z+=MathUtils.clamp(leg.plant.z-this.point.z,-C.plantCorrection,C.plantCorrection);}
      if(leg.weight>.005)this.solver.solve(leg.upper,leg.lower,leg.foot,this.target,leg.weight);
      leg.previous.copy(this.point);this.contacts[i===0?'left':'right']=leg.weight;
    }
  }
}
