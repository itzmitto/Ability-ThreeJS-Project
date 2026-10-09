import { DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Matrix4, Object3D, PlaneGeometry, Vector3 } from 'three';
import type { VisualOwner } from '../elemental/ElementalVisuals';
import { ease } from '../elemental/ElementalVisuals';
import { prismStreakMaterial } from './PrismCrystalMaterials';
import type { PrismProjectileSystem } from './PrismProjectileSystem';
/** Compact camera-facing tapered streaks; fixed storage and no full-scene afterimage rendering. */
export class PrismTrails {
  readonly mesh:InstancedMesh;
  private readonly attribute:InstancedBufferAttribute;
  private readonly transform=new Object3D();
  private readonly head=new Vector3();private readonly tail=new Vector3();private readonly direction=new Vector3();
  private readonly eye=new Vector3();private readonly right=new Vector3();private readonly normal=new Vector3();private readonly basis=new Matrix4();
  constructor(owner:VisualOwner,private readonly projectiles:PrismProjectileSystem){
    const capacity=projectiles.budget.shots*projectiles.budget.trails,g=owner.geometry(new PlaneGeometry(1,1));
    this.attribute=new InstancedBufferAttribute(new Float32Array(capacity*4),4).setUsage(DynamicDrawUsage);g.setAttribute('aBolt',this.attribute);
    this.mesh=new InstancedMesh(g,owner.material(prismStreakMaterial()),capacity);this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);this.mesh.frustumCulled=false;owner.root.add(this.mesh);
  }
  update(t:number,cameraLocal:Vector3):void {
    const system=this.projectiles,d=this.transform;let count=0;
    for(const s of system.shots){const age=t-s.birth;if(!s.released||age<0||age>s.duration+.11)continue;
      for(let layer=0;layer<system.budget.trails;layer++){
        const p=Math.min(1,age/s.duration),tailP=Math.max(0,(Math.min(age,s.duration)-(.045+layer*.023))/s.duration);
        system.sample(s,p,this.head);system.sample(s,tailP,this.tail);const length=this.head.distanceTo(this.tail);if(length<.005)continue;
        this.direction.copy(this.head).sub(this.tail).normalize();d.position.copy(this.head).add(this.tail).multiplyScalar(.5);
        this.eye.copy(cameraLocal).sub(d.position);this.right.crossVectors(this.direction,this.eye);if(this.right.lengthSq()<.000001)this.right.set(1,0,0);else this.right.normalize();
        this.normal.crossVectors(this.right,this.direction).normalize();this.basis.makeBasis(this.right,this.direction,this.normal);d.quaternion.setFromRotationMatrix(this.basis);
        const width=(.035+s.scale*.045)*(layer===0?1:layer===1?.43:1.65);
        d.scale.set(width,length,1);d.updateMatrix();this.mesh.setMatrixAt(count,d.matrix);
        this.attribute.setXYZW(count,(1-ease((age-s.duration)/.11))*(layer===2?.12:layer===1?.3:.45),s.final?2:1,(s.hue+layer*.025)%1,s.seed);count++;
      }
    }
    this.mesh.count=count;this.mesh.instanceMatrix.needsUpdate=true;this.attribute.needsUpdate=true;
  }
}
