import { DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Object3D, PlaneGeometry, Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { VisualOwner } from '../elemental/ElementalVisuals';
import { AstralParticles } from '../elemental/AstralVisuals';
import { ease, hash } from '../elemental/ElementalVisuals';
import { combustionMaterial } from './FireStream';
import type { FirePacket } from './FireStream';
import type { FireBudget } from './DragonfireConfig';
interface Ember { time:number;life:number;seed:number;size:number;start:Vector3;velocity:Vector3; }
/** Cast-owned fixed pools layered on the existing billboard utilities; no persistent emitter engine. */
export class FireParticles {
  readonly flames:InstancedMesh;readonly sparks:AstralParticles;readonly smoke:AstralParticles;
  private readonly material;private readonly attributes:InstancedBufferAttribute;
  private readonly pool:Ember[];private readonly smokePool:Ember[];
  private cursor=0;private smokeCursor=0;private sequence=0;
  private readonly transform=new Object3D();private readonly axis=new Vector3(0,1,0);private readonly unit=new Vector3();
  constructor(owner:VisualOwner,private readonly budget:FireBudget){
    this.pool=Array.from({length:budget.flames},()=>({time:-100,life:1,seed:0,size:0,start:new Vector3(),velocity:new Vector3()}));
    this.smokePool=Array.from({length:budget.smoke},()=>({time:-100,life:1.4,seed:0,size:0,start:new Vector3(),velocity:new Vector3()}));
    const g=owner.geometry(new PlaneGeometry(1,1,2,5));this.attributes=new InstancedBufferAttribute(new Float32Array(budget.flames*4),4).setUsage(DynamicDrawUsage);g.setAttribute('aFire',this.attributes);this.material=owner.material(combustionMaterial());
    this.flames=new InstancedMesh(g,this.material,budget.flames);this.flames.frustumCulled=false;owner.root.add(this.flames);
    this.sparks=new AstralParticles(owner,budget.sparks,'#ffb54b','electric');this.smoke=new AstralParticles(owner,budget.smoke,'#252b31','solar',true);
  }
  emit(packet:FirePacket):void {
    const count=this.budget.flames===80?3:this.budget.flames===160?5:8;
    for(let i=0;i<count;i++){
      const seed=hash(this.sequence++ +31),a=seed*Math.PI*2,p=this.pool[this.cursor++%this.pool.length];
      p.time=packet.birth;p.seed=seed;p.life=Math.min(1.05,packet.duration+.22);p.size=.18+seed*.2;p.start.copy(packet.start);
      p.velocity.copy(packet.direction).multiplyScalar(26+seed*5);p.velocity.x+=Math.cos(a)*(1+seed);p.velocity.z+=Math.sin(a)*(1+seed);p.velocity.y+=.3+seed;
    }
    if(this.sequence%3===0){const s=this.smokePool[this.smokeCursor++%this.smokePool.length];s.time=packet.birth+.13;s.seed=packet.seed;s.life=1.3;s.size=.35;s.start.copy(packet.start).addScaledVector(packet.direction,1.8);s.velocity.copy(packet.direction).multiplyScalar(4);s.velocity.y=.8;}
  }
  update(t:number,context:AbilityCastContext):void {
    this.material.uniforms.uTime.value=t;const d=this.transform;let flames=0,sparks=0,smoke=0;
    for(const p of this.pool){const age=t-p.time;if(age<0||age>p.life)continue;
      d.position.copy(p.start).addScaledVector(p.velocity,age);d.position.y+=Math.sin(age*9+p.seed*11)*.09;const fade=(1-ease(age/p.life))*(d.position.y>.07?1:0);
      if(fade>.01){d.quaternion.setFromUnitVectors(this.axis,this.unit.copy(p.velocity).normalize());d.rotateY(p.seed*6);d.scale.set(p.size,1+age*1.6,1);d.updateMatrix();this.flames.setMatrixAt(flames,d.matrix);this.attributes.setXYZW(flames,fade*.65,p.seed,.3,age);flames++;}
      if(sparks<this.budget.sparks){d.position.copy(p.start).addScaledVector(p.velocity,age*.87);d.position.y+=age*.65-2*age*age;d.quaternion.copy(context.camera.quaternion);d.scale.set(.018+p.seed*.022,.07+p.seed*.1,1);d.updateMatrix();this.sparks.mesh.setMatrixAt(sparks++,d.matrix);}
    }
    for(const p of this.smokePool){const age=t-p.time;if(age<0||age>p.life)continue;const drag=(1-Math.exp(-age*2))/2,fade=ease(age/.12)*(1-ease((age-.7)/.6));d.position.copy(p.start).addScaledVector(p.velocity,drag);d.position.y+=age*.5;d.quaternion.copy(context.camera.quaternion);d.scale.setScalar((p.size+age*.65)*fade);d.updateMatrix();this.smoke.mesh.setMatrixAt(smoke++,d.matrix);}
    this.flames.count=flames;this.sparks.mesh.count=sparks;this.smoke.mesh.count=smoke;this.attributes.needsUpdate=true;
    this.flames.instanceMatrix.needsUpdate=this.sparks.mesh.instanceMatrix.needsUpdate=this.smoke.mesh.instanceMatrix.needsUpdate=true;
    this.smoke.material.uniforms.uFade.value=.2;this.sparks.material.uniforms.uFade.value=.65*(1-ease((t-3.5)/.8));
  }
}
