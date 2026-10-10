import { Group,Mesh,PointLight,Quaternion,Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { ManagedEffect } from '../../effects/EffectManager';
import { SweptVolume } from '../bending/SweptVolume';
import { bendingTier,ease } from '../bending/BendingSupport';
import { flowingFlameMaterial } from './FlowingFlameMaterial';
import { InfernoParticles } from './InfernoParticles';
import { InfernoImpact } from './InfernoImpact';
import { INFERNO_CONFIG as C,INFERNO_BUDGETS } from './DancingInfernoConfig';
export class DancingInfernoEffect implements ManagedEffect{
  readonly root=new Group();active=false;private ctx!:AbilityCastContext;private age=0;private tier=0;private impacted=false;private travel=0;private length=1;private releaseLease?:()=>void;private unsubscribe?:()=>void;
  private readonly materials=[0,1,2].map(flowingFlameMaterial);private readonly sweeps=INFERNO_BUDGETS.map(q=>Array.from({length:6},()=>new SweptVolume(q.segments,q.sides)));
  private readonly meshes=Array.from({length:6},(_,i)=>new Mesh(this.sweeps[0][i].geometry,this.materials[i%3]));
  private readonly particles=new InfernoParticles();private readonly impact=new InfernoImpact();private readonly light=new PointLight('#ff6d20',0,9,2);
  readonly target=new Vector3();readonly launch=new Vector3();private readonly localTarget=new Vector3();private readonly hands=[new Vector3(),new Vector3()];private readonly inverse=new Quaternion();private readonly direction=new Vector3();
  private stream=0;private layer=0;private progress=0;
  private readonly path=(t:number,out:Vector3)=>{
    const hand=this.hands[this.stream],side=this.stream?1:-1,phase=this.age*3+this.layer*.44+this.stream*.8;
    if(this.age<C.charge){const a=t*Math.PI*2+phase, r=.15+this.layer*.07;out.set(hand.x+Math.cos(a)*r,hand.y+Math.sin(a)*r,hand.z-.6*t*ease(this.age/C.charge));return;}
    const f=t*Math.max(.008,this.progress),radius=Math.sin(f*Math.PI)*C.curvature;
    out.copy(hand).lerp(this.localTarget,f);out.x+=side*Math.cos(f*9+phase)*radius;out.y+=side*Math.sin(f*9+phase)*radius*.55+Math.sin(f*Math.PI)*1.3;out.z+=Math.sin(f*11+phase)*radius*.12;
  };
  private readonly radius=(t:number)=>C.thickness*(.07+.93*Math.sin(t*Math.PI))*(.85+.25*Math.sin(t*31-this.age*C.flowSpeed+this.layer*2))*(1-this.layer*.19);
  get arrival():number{return C.charge+this.travel;}
  get particleCount():number{return this.active?INFERNO_BUDGETS[this.tier].particles:0;}get instanceCount():number{return 0;}
  constructor(){this.root.name='Dancing Inferno · dual flowing combustion';this.root.userData.bendingId='dancing-inferno';this.root.userData.castOrigin=this.launch;this.meshes.forEach((m,i)=>{m.name=`${i<3?'Right':'Left'} flame tongue ${i%3}`;m.frustumCulled=false;this.root.add(m);});this.root.add(this.particles.mesh,this.impact.root,this.light);}
  activate(c:AbilityCastContext,target:Vector3,release:()=>void):void{
    this.ctx=c;this.target.copy(target);this.age=0;this.active=true;this.impacted=false;this.releaseLease=release;this.root.position.copy(c.player.position);
    this.direction.subVectors(target,this.root.position);this.direction.y=0;this.length=this.direction.length();this.travel=this.length/C.speed;this.root.quaternion.setFromUnitVectors(new Vector3(0,0,-1),this.direction.normalize());this.inverse.copy(this.root.quaternion).invert();this.localTarget.copy(target).sub(this.root.position).applyQuaternion(this.inverse);this.localTarget.y+=.15;this.impact.root.position.copy(this.localTarget);this.impact.root.position.y-=.1;
    this.unsubscribe=c.quality.subscribe(q=>{this.tier=bendingTier(q);this.materials.forEach(m=>m.uniforms.uDetail.value=this.tier);this.light.visible=this.tier>0;});c.scene.add(this.root);this.update(0,0);
  }
  update(dt:number,_time:number):boolean{
    if(!this.active)return false;this.age+=dt;const t=this.age-this.arrival;if(t>=C.aftermath)return false;
    if(this.age<C.charge){this.ctx.player.visual.getRightHandWorldPosition(this.hands[0]);this.ctx.player.visual.getLeftHandWorldPosition(this.hands[1]);this.launch.copy(this.hands[0]);for(const h of this.hands)h.sub(this.root.position).applyQuaternion(this.inverse);}
    this.progress=ease((this.age-C.charge)/Math.max(.05,this.travel));const alpha=ease(this.age/.15)*(1-ease(Math.max(0,t)/.26));
    for(let i=0;i<6;i++){this.stream=i<3?0:1;this.layer=i%3;const m=this.meshes[i];m.visible=this.layer<INFERNO_BUDGETS[this.tier].layers&&alpha>.003;m.geometry=this.sweeps[this.tier][i].geometry;if(m.visible)this.sweeps[this.tier][i].update(this.path,this.radius,.16);}
    this.materials.forEach(m=>{m.uniforms.uTime.value=this.age;m.uniforms.uAlpha.value=alpha;});
    if(t>=0&&!this.impacted){this.impacted=true;this.target.y=this.ctx.water?.getSurfaceHeight(this.target.x,this.target.z)??this.target.y;this.particles.material.uniforms.uSurface.value=this.target.y-this.root.position.y;this.ctx.cameraFeedback?.(.038,.14);this.ctx.water?.addRipple({position:this.target,strength:.65,duration:1.6,waveSpeed:4,radius:.6,displacementScale:.5},this);this.ctx.water?.addRipple({position:this.target,strength:.3,duration:1.2,waveSpeed:3,radius:1.3},this);}
    if(t>=0)this.impact.root.position.y=(this.ctx.water?.getSurfaceHeight(this.target.x,this.target.z)??this.target.y)-this.root.position.y+.055;this.impact.update(t,this.tier);
    this.particles.hands[0].copy(this.hands[0]);this.particles.hands[1].copy(this.hands[1]);this.particles.update(this.age,t,this.length,this.particleCount,ease(this.age/.16)*(1-ease(Math.max(0,t)/C.aftermath)),this.progress);
    this.light.position.copy(this.hands[0]).lerp(this.localTarget,this.progress);this.light.intensity=t<0?(.4+.8*this.progress)*alpha:2.1*Math.exp(-t*5.);
    this.root.userData.phase=this.age<.23?'gather':this.age<C.charge?'weave':t<0?'flow':t<.6?'bloom':'steam';this.root.userData.contacts=this.impacted?1:0;return true;
  }
  dispose():void{if(!this.active)return;this.active=false;this.unsubscribe?.();this.unsubscribe=undefined;this.ctx.water?.removeOwner(this);this.root.removeFromParent();this.light.intensity=0;this.releaseLease?.();this.releaseLease=undefined;}
  destroy():void{this.dispose();this.sweeps.flat().forEach(s=>s.dispose());this.materials.forEach(m=>m.dispose());this.particles.dispose();this.impact.dispose();this.light.dispose();}
}
