import { Group,Mesh,Quaternion,Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { ManagedEffect } from '../../effects/EffectManager';
import { bendingTier,ease } from '../bending/BendingSupport';
import { SKY_CONFIG as C,SKY_BUDGETS } from './SkybreakerConfig';
import { createPressureBlades } from './PressureBladeGeometry';
import { pressureMaterial } from './PressureMaterial';
import { AirDroplets } from './AirDroplets';
import { AirWaterWake } from './AirWaterWake';
export class SkybreakerEffect implements ManagedEffect{
  readonly root=new Group();active=false;private ctx!:AbilityCastContext;private age=0;private tier=0;private releaseLease?:()=>void;private unsubscribe?:()=>void;
  private readonly geometries=createPressureBlades();private readonly particles=new AirDroplets();private readonly wakes=[0,1,2].map(()=>new AirWaterWake());
  private readonly blades=[0,1,2].map(()=>{const body=pressureMaterial(),edge=pressureMaterial(true),group=new Group(),a=new Mesh(this.geometries[0].body,body),b=new Mesh(this.geometries[0].edge,edge);a.frustumCulled=b.frustumCulled=false;group.add(a,b);return {group,body,edge,a,b};});
  readonly target=new Vector3();private readonly origins=[new Vector3(),new Vector3(),new Vector3()];private readonly ends=[new Vector3(),new Vector3(),new Vector3()];
  private readonly times=new Float32Array(3);private readonly launched=[false,false,false];private readonly hit=[false,false,false];
  private readonly inverse=new Quaternion();private readonly scratch=new Vector3();private readonly direction=new Vector3();private readonly splitStart=new Vector3();private length=1;
  get particleCount():number{return this.active?SKY_BUDGETS[this.tier].particles:0;}get instanceCount():number{return 0;}
  constructor(){this.root.name='Skybreaker · three pressure crescents';this.root.userData.bendingId='skybreaker';this.blades.forEach(b=>this.root.add(b.group));this.wakes.forEach(w=>this.root.add(w.mesh));this.root.add(this.particles.mesh);}
  activate(c:AbilityCastContext,target:Vector3,release:()=>void):void{
    this.ctx=c;this.target.copy(target);this.age=0;this.active=true;this.releaseLease=release;this.root.position.copy(c.player.position);
    this.direction.subVectors(target,this.root.position);this.direction.y=0;this.length=this.direction.length();this.root.quaternion.setFromUnitVectors(new Vector3(0,0,-1),this.direction.normalize());this.inverse.copy(this.root.quaternion).invert();
    this.launched.fill(false);this.hit.fill(false);this.particles.hits.set(-1,-1,-1);
    for(let i=0;i<3;i++){const fan=(i-1)*.105;this.ends[i].set(Math.sin(fan)*this.length,target.y-this.root.position.y+.25,-Math.cos(fan)*this.length);this.origins[i].copy(c.origin).sub(this.root.position).applyQuaternion(this.inverse);this.times[i]=C.release+i*C.interval+this.origins[i].distanceTo(this.ends[i])/C.speed;}
    this.unsubscribe=c.quality.subscribe(q=>{this.tier=bendingTier(q);this.blades.forEach(b=>{b.a.geometry=this.geometries[this.tier].body;b.b.geometry=this.geometries[this.tier].edge;b.body.uniforms.uDetail.value=this.tier;b.edge.uniforms.uDetail.value=this.tier;b.body.uniforms.uDistortion.value=this.tier===0?0:C.distortion*(this.tier===1?.6:1);b.edge.uniforms.uDistortion.value=this.tier===0?0:C.distortion*.35;});});c.scene.add(this.root);this.update(0,0);
  }
  update(dt:number,_time:number):boolean{
    if(!this.active)return false;this.age+=dt;if(this.age>this.times[2]+C.aftermath)return false;
    for(let i=0;i<3;i++){
      const release=C.release+i*C.interval,b=this.blades[i],end=this.ends[i];
      if(!this.launched[i]){this.ctx.player.visual.getRightHandWorldPosition(this.origins[i]);this.origins[i].sub(this.root.position).applyQuaternion(this.inverse);if(this.age>=release){this.launched[i]=true;this.times[i]=release+this.origins[i].distanceTo(end)/C.speed;this.ctx.cameraFeedback?.(.013,.055);}}
      const flight=(this.age-release)/Math.max(.01,this.times[i]-release),impact=this.age-this.times[i];
      b.group.position.copy(this.origins[i]).lerp(end,Math.max(0,Math.min(1,flight)));b.group.position.y+=Math.sin(Math.max(0,Math.min(1,flight))*Math.PI)*.65;
      b.group.quaternion.setFromUnitVectors(this.scratch.set(0,0,-1),this.direction.subVectors(end,this.origins[i]).normalize());b.group.rotateZ(Math.PI/2+(i===0?-.2:i===1?.23:0));
      b.group.scale.setScalar(this.age<release?.11*ease(this.age/.15):(i===2?1.18:1)*(.3+.7*ease((this.age-release)/.08)));
      if(this.age<release)b.group.rotateZ(this.age*8+i*2);b.group.visible=this.age>=.04&&impact<.18&&(i===0||this.age>=release);
      const alpha=impact<0?ease(this.age/.12):1-ease(impact/.18);b.body.uniforms.uTime.value=this.age;b.body.uniforms.uAlpha.value=alpha;b.edge.uniforms.uTime.value=this.age;b.edge.uniforms.uAlpha.value=alpha;
      this.particles.centers[i].copy(b.group.position);this.particles.hits.setComponent(i,impact);
      const wake=this.wakes[i];wake.mesh.position.copy(b.group.position);this.scratch.copy(b.group.position).applyQuaternion(this.root.quaternion).add(this.root.position);wake.mesh.position.y=(this.ctx.water?.getSurfaceHeight(this.scratch.x,this.scratch.z)??0)-this.root.position.y+.04;
      wake.mesh.rotation.z=(i-1)*.105;wake.update(this.age,this.age<release?0:impact<0?.75:Math.max(0,1-impact/1.1));
      if(!this.hit[i]&&impact>=0){this.hit[i]=true;const contact=this.scratch.copy(end).applyQuaternion(this.root.quaternion).add(this.root.position);contact.y=this.ctx.water?.getSurfaceHeight(contact.x,contact.z)??0;
        this.splitStart.copy(end).addScaledVector(this.direction.subVectors(end,this.origins[i]).normalize(),-7).applyQuaternion(this.root.quaternion).add(this.root.position);
        this.ctx.water?.addSplit({start:this.splitStart,end:contact,width:i===2?4.5:3,depth:i===2?.55:.22,duration:1.2},this);
        this.ctx.water?.addRipple({position:contact,strength:C.pressure*(i===2?2.4:1),duration:1.3,waveSpeed:i===2?6:4,radius:.4,displacementScale:i===2?.7:.3},this);
        if(i===2)this.ctx.cameraFeedback?.(.036,.11);
      }
    }
    this.particles.update(this.age,this.age-this.times[2],this.length,this.particleCount,ease(this.age/.12)*(1-ease(Math.max(0,this.age-this.times[2])/C.aftermath)));
    this.root.userData.phase=this.age<C.release?'gather':this.age<C.release+C.interval*2?'sweep':this.hit[2]?'dissipation':'flight';this.root.userData.contacts=Number(this.hit[0])+Number(this.hit[1])+Number(this.hit[2]);return true;
  }
  dispose():void{if(!this.active)return;this.active=false;this.unsubscribe?.();this.unsubscribe=undefined;this.ctx.water?.removeOwner(this);this.root.removeFromParent();this.releaseLease?.();this.releaseLease=undefined;}
  destroy():void{this.dispose();this.geometries.forEach(g=>{g.body.dispose();g.edge.dispose();});this.blades.forEach(b=>{b.body.dispose();b.edge.dispose();});this.particles.dispose();this.wakes.forEach(w=>w.dispose());}
}
