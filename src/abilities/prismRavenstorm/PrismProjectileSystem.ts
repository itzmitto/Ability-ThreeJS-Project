import { DynamicDrawUsage, InstancedMesh, Object3D, Vector3 } from 'three';
import type { InstancedBufferAttribute } from 'three';
import type { VisualOwner } from '../elemental/ElementalVisuals';
import { clamp01, ease, hash } from '../elemental/ElementalVisuals';
import type { RavenstormBudget } from './PrismRavenstormConfig';
import { prismBoltGeometry } from './PrismCrystalGeometry';
import { prismBoltMaterial } from './PrismCrystalMaterials';
export interface PrismShot { birth:number; duration:number; released:boolean; hit:boolean; final:boolean; pattern:number; seed:number; hue:number; scale:number; start:Vector3; end:Vector3; side:Vector3; arc:number; }
/** A tip-anchored crystal must clear the hand before its full tail can unfold. */
export function prismLaunchScale(desired:number,travelled:number,length:number):number {
  return Math.min(desired,(Math.max(0,travelled)+.65)/Math.max(.01,length));
}
/** Authored firing windows and fixed per-cast shot records. Launch positions are captured from the animated hand. */
export class PrismProjectileSystem {
  readonly shots:PrismShot[]=[];
  readonly meshes:InstancedMesh[]=[];
  readonly material;
  readonly counts=new Uint16Array(5);
  private readonly front=new Float32Array(5);
  private readonly lengths=new Float32Array(5);
  private readonly attributes:InstancedBufferAttribute[]=[];
  private readonly transform=new Object3D();
  private readonly axis=new Vector3(0,1,0);
  private readonly forward=new Vector3();
  private readonly right=new Vector3();
  private readonly tip=new Vector3();
  private readonly next=new Vector3();
  private readonly up=new Vector3(0,1,0);
  constructor(owner:VisualOwner,readonly budget:RavenstormBudget){
    this.material=owner.material(prismBoltMaterial());
    for(let v=0;v<budget.variants;v++){
      const g=owner.geometry(prismBoltGeometry(v,Math.ceil(budget.shots/budget.variants)));this.attributes.push(g.getAttribute('aBolt') as InstancedBufferAttribute);g.computeBoundingBox();this.front[v]=g.boundingBox!.max.y;this.lengths[v]=g.boundingBox!.max.y-g.boundingBox!.min.y;
      const m=new InstancedMesh(g,this.material,Math.ceil(budget.shots/budget.variants));m.instanceMatrix.setUsage(DynamicDrawUsage);m.frustumCulled=false;owner.root.add(m);this.meshes.push(m);
    }
    const opening=Math.floor(budget.shots*.1),variation=Math.floor(budget.shots*.2),main=budget.shots-opening-variation-budget.final;
    for(let i=0;i<budget.shots;i++){
      const seed=hash(i+79);let birth:number,pattern:number;
      if(i<opening){const j=i;birth=.82+Math.floor(j/4)/Math.ceil(opening/4)*.52+(j%4)*.022;pattern=0;}
      else if(i<opening+main){const j=i-opening;birth=1.55+Math.floor(j/10)/Math.ceil(main/10)*2.82+(j%10)*.009;pattern=Math.floor(j/30)%3;}
      else if(i<budget.shots-budget.final){const j=i-opening-main;birth=4.55+j/variation*.92;pattern=2+j%2;}
      else{const j=i-(budget.shots-budget.final);birth=5.8+j/Math.max(1,budget.final-1)*.48;pattern=4;}
      const final=pattern===4,a=i*2.39996,r=(final?.7:pattern===1?5.8:pattern===3?4.3:2.6)*Math.sqrt(hash(i+41));
      this.shots.push({birth,duration:.5,released:false,hit:false,final,pattern,seed,hue:(hash(i+211)*.7+(Math.floor(i/10)%7)/7*.3)%1,scale:final?1.05+seed*.25:i%9===0?.8+seed*.25:.52+seed*.38,start:new Vector3(),end:new Vector3(Math.cos(a)*r,.1,Math.sin(a)*r),side:new Vector3(),arc:pattern>=2?(seed-.5)*3.8:(seed-.5)*.75});
    }
  }
  sample(s:PrismShot,p:number,out:Vector3):Vector3 {
    const u=clamp01(p),envelope=Math.sin(u*Math.PI),spiral=s.pattern===3?Math.sin(u*Math.PI*4+s.seed*6.283)*.7:0;
    out.copy(s.start).lerp(s.end,u).addScaledVector(s.side,envelope*(s.arc+spiral));out.y+=envelope*(s.pattern===2?1.1:.25)+envelope*spiral*.45;return out;
  }
  update(t:number,hand:Vector3,onHit:(s:PrismShot)=>void):void {
    this.counts.fill(0);this.material.uniforms.uTime.value=t;const d=this.transform;
    for(let i=0;i<this.shots.length;i++){
      const s=this.shots[i],age=t-s.birth,v=i%this.budget.variants;
      if(age<-.2)continue;
      if(!s.released){
        this.forward.copy(s.end).sub(hand).normalize();this.right.crossVectors(this.forward,this.up);if(this.right.lengthSq()<.0001)this.right.set(1,0,0);else this.right.normalize();
        const angle=i*2.39996+t*2,radius=(s.final?.35:.18+s.seed*.4)*ease((age+.2)/.2);
        s.start.copy(hand).addScaledVector(this.forward,.25).addScaledVector(this.right,Math.cos(angle)*radius);s.start.y+=Math.sin(angle)*radius;
        s.side.copy(this.right);s.duration=Math.max(.18,Math.min(s.final?.64:.68,s.start.distanceTo(s.end)/(s.final?110:85+s.seed*25)));
        if(age>=0)s.released=true;
      }
      if(age>=s.duration){if(!s.hit){s.hit=true;onHit(s);}continue;}
      const n=this.counts[v]++,p=age<0?0:age/s.duration;
      this.sample(s,p,this.tip);this.sample(s,Math.min(1,p+.025),this.next);this.forward.copy(this.next).sub(this.tip);
      if(this.forward.lengthSq()<.000001)this.forward.copy(s.end).sub(s.start);this.forward.normalize();
      const scale=prismLaunchScale(s.scale*(age<0?ease((age+.2)/.2):1),this.tip.distanceTo(s.start),this.lengths[v]);
      d.position.copy(this.tip).addScaledVector(this.forward,-this.front[v]*scale);d.quaternion.setFromUnitVectors(this.axis,this.forward);d.rotateY(s.seed*6.283+t*(age<0?2.8:s.final?1.7:2.2));
      d.scale.setScalar(Math.max(.001,scale));d.updateMatrix();this.meshes[v].setMatrixAt(n,d.matrix);
      this.attributes[v].setXYZW(n,(1-ease((t-7.4)/.6))*(age<0?.75:1),s.final?2.4:1,s.hue,s.seed);
    }
    for(let v=0;v<this.meshes.length;v++){const m=this.meshes[v];m.count=this.counts[v];m.instanceMatrix.needsUpdate=true;this.attributes[v].needsUpdate=true;}
  }
}
