import { Group, Mesh, Quaternion, Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { ManagedEffect } from '../../effects/EffectManager';
import { SweptVolume } from '../bending/SweptVolume';
import { bendingTier,ease } from '../bending/BendingSupport';
import { tidalWaterMaterial } from './TidalWaterMaterial';
import { TidalDroplets } from './TidalDroplets';
import { TIDAL_CONFIG as C,TIDAL_BUDGETS } from './TidalSerpentConfig';
/** Two continuous liquid volumes: wrist gathering -> crossing surge -> liquid collapse. */
export class TidalSerpentEffect implements ManagedEffect {
  readonly root=new Group();active=false;private age=0;private tier=0;private impacted=false;
  private ctx!:AbilityCastContext;private releaseLease?:()=>void;private unsubscribe?:()=>void;
  private readonly water=tidalWaterMaterial();private readonly drops=new TidalDroplets();
  private readonly sweeps=TIDAL_BUDGETS.map(q=>[new SweptVolume(q.segments,q.sides),new SweptVolume(q.segments,q.sides)]);
  private readonly meshes=[new Mesh(this.sweeps[0][0].geometry,this.water.material),new Mesh(this.sweeps[0][1].geometry,this.water.material)];
  readonly target=new Vector3();readonly launch=new Vector3();private readonly hands=[new Vector3(),new Vector3()];
  private readonly direction=new Vector3();private readonly localTarget=new Vector3();private readonly inverse=new Quaternion();
  private side=1;private progress=0;private travel=0;private length=1;private stream=0;private drawHeight=0;
  private readonly path=(t:number,out:Vector3)=>{
    const h=this.hands[this.stream],s=this.side;
    if(this.age<C.charge){const grow=ease(this.age/.25),a=t*Math.PI*2+this.age*7;
      out.set(h.x+Math.sin(a)*.32*grow,this.drawHeight+(h.y-this.drawHeight)*t*grow, h.z+Math.cos(a)*.32*grow);return;}
    const f=t*this.progress,bulge=Math.sin(f*Math.PI);
    out.copy(h).lerp(this.localTarget,f);
    out.x+=s*bulge*C.curvature*Math.cos(f*Math.PI*2+this.age*2.5);
    out.y+=bulge*(1.3+Math.sin(f*Math.PI*3+this.age*5)*.4);
    out.z+=Math.sin(f*Math.PI*3+this.age*4)*bulge*.25;
    if(this.impacted)out.y-=ease((this.age-this.arrival)/1.15)*Math.sin(t*Math.PI)*2.8;
  };
  private readonly radius=(t:number)=>C.thickness*(.18+.82*Math.sin(t*Math.PI))*(.88+.13*Math.sin(t*26-this.age*9));
  get arrival():number{return C.charge+this.travel;}
  get particleCount():number{return this.active?TIDAL_BUDGETS[this.tier].particles:0;}
  get instanceCount():number{return 0;}
  constructor(){this.root.name='Tidal Serpent · crossing liquid volumes';this.root.userData.bendingId='tidal-serpent';this.meshes.forEach((m,i)=>{m.name=i?'Left liquid whip':'Right liquid whip';m.frustumCulled=false;this.root.add(m);});this.root.add(this.drops.mesh);}
  activate(ctx:AbilityCastContext,target:Vector3,release:()=>void):void{
    this.ctx=ctx;this.releaseLease=release;this.age=0;this.impacted=false;this.active=true;this.target.copy(target);
    this.launch.copy(ctx.origin);this.root.position.copy(ctx.player.position);this.direction.subVectors(target,this.root.position);this.direction.y=0;this.length=this.direction.length();this.travel=this.length/C.speed;
    this.root.quaternion.setFromUnitVectors(new Vector3(0,0,-1),this.direction.normalize());this.inverse.copy(this.root.quaternion).invert();
    this.localTarget.copy(target).sub(this.root.position).applyQuaternion(this.inverse);
    this.unsubscribe=ctx.quality.subscribe(q=>{this.tier=bendingTier(q);this.meshes.forEach((m,i)=>m.geometry=this.sweeps[this.tier][i].geometry);this.water.uniforms.uBendDetail.value=this.tier;});
    ctx.scene.add(this.root);ctx.water?.addRipple({position:ctx.player.position,strength:.35,duration:1.1,waveSpeed:3,radius:.4,displacementScale:.4},this);this.update(0,0);
  }
  update(dt:number,_time:number):boolean{
    if(!this.active)return false;this.age+=dt;const impactAge=this.age-this.arrival;
    if(impactAge>=C.aftermath)return false;
    if(this.age<C.charge){this.drawHeight=(this.ctx.water?.getSurfaceHeight(this.root.position.x,this.root.position.z)??0)-this.root.position.y;this.ctx.player.visual.getRightHandWorldPosition(this.hands[0]);this.ctx.player.visual.getLeftHandWorldPosition(this.hands[1]);for(const h of this.hands)h.sub(this.root.position).applyQuaternion(this.inverse);}
    this.progress=ease((this.age-C.charge)/Math.max(.05,this.travel));
    if(impactAge>=0&&!this.impacted){this.impacted=true;this.ctx.cameraFeedback?.(.035,.13);this.ctx.water?.addRipple({position:this.target,strength:.95,duration:1.5,waveSpeed:5,radius:.5,displacementScale:.9},this);this.ctx.water?.addRipple({position:this.target,strength:.4,duration:1.2,waveSpeed:3,radius:1.1},this);}
    const fade=this.age<C.charge?ease(this.age/.12):1-ease(Math.max(0,impactAge)/1.1);
    this.water.uniforms.uBendFade.value=fade;this.water.uniforms.uBendTime.value=this.age;
    for(let i=0;i<2;i++){this.stream=i;this.side=i?-1:1;this.sweeps[this.tier][i].update(this.path,this.radius,.72);this.meshes[i].visible=fade>.005;}
    this.drops.update(this.age,impactAge,this.length,this.particleCount,ease(this.age/.3)*(1-ease(Math.max(0,impactAge)/C.aftermath)));
    this.root.userData.phase=this.age<.22?'draw':this.age<C.charge?'gather':impactAge<0?'release':impactAge<.35?'splash':'return';this.root.userData.contacts=this.impacted?1:0;return true;
  }
  dispose():void{if(!this.active)return;this.active=false;this.unsubscribe?.();this.unsubscribe=undefined;this.ctx.water?.removeOwner(this);this.root.removeFromParent();this.releaseLease?.();this.releaseLease=undefined;}
  destroy():void{this.dispose();this.sweeps.flat().forEach(s=>s.dispose());this.water.material.dispose();this.drops.dispose();}
}
