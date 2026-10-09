import { AdditiveBlending, Mesh, ShaderMaterial, SphereGeometry, Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import { PackEffect, shardGeometry } from '../elemental/PackVisuals';
import { ease } from '../elemental/ElementalVisuals';
import { KRAKEN, KRAKEN_QUALITY } from './KrakenConfig';
import { KrakenTentacleRig } from './KrakenTentacleRig';
import { KrakenRift } from './KrakenRift';
import { KrakenParticles } from './KrakenParticles';
import { KrakenWaterInteraction } from './KrakenWaterInteraction';
export class KrakenCrownEffect extends PackEffect {
  private readonly rig:KrakenTentacleRig;
  private readonly rift:KrakenRift;
  private readonly particles=new KrakenParticles(this.owner);
  private readonly water:KrakenWaterInteraction;
  private readonly entry:number;
  private finaleFired=false;
  private readonly flashMaterial:ShaderMaterial;
  private readonly flash:Mesh;
  private lightBoost=0;
  constructor(context:AbilityCastContext,target:Vector3){
    super(context,target,'#42aaa9',shardGeometry());
    this.entry=Math.atan2(context.player.position.z-target.z,context.player.position.x-target.x);
    this.rig=new KrakenTentacleRig(this.owner,this.entry);this.rift=new KrakenRift(this.owner,context.player.position,target);this.water=new KrakenWaterInteraction(this.owner,context,target,this);
    this.flashMaterial=this.owner.material(new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,
      uniforms:{uFade:{value:0}},vertexShader:'varying vec3 vNormal,vWorld;void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader:'varying vec3 vNormal,vWorld;uniform float uFade;void main(){float edge=pow(1.-abs(dot(normalize(vNormal),normalize(cameraPosition-vWorld))),2.);gl_FragColor=vec4(mix(vec3(.15,.14,.35),vec3(.38,.87,.87),edge),uFade*(.1+edge*.4));}' }));
    this.flash=new Mesh(this.owner.geometry(new SphereGeometry(1,32,16)),this.flashMaterial);this.owner.root.add(this.flash);this.light.distance=38;this.update(0,context.time);
  }
  get particleCount():number{return this.particles.snow.mesh.count+this.particles.spray.mesh.count+this.particles.ink.mesh.count;}
  get instanceCount():number{return this.particleCount+this.rig.meshes.reduce((n,m)=>n+m.count,0)+this.water.rings.count+this.water.sheets.count;}
  private readonly onImpact=(time:number,x:number,z:number,power:number,finale:boolean,breach:boolean):void=>{
    const q=KRAKEN_QUALITY[this.context.quality.preset];
    // All final arms keep their press/flash animation, but the large response fires ONCE.
    if(finale){if(this.finaleFired)return;this.finaleFired=true;
      this.particles.emit(time,0,0,1.7,q,true);this.water.impact(time,0,0,1.7,true,q.impacts);
      this.context.cameraFeedback?.(.008,.35);this.lightBoost=22;
    }else {
      this.particles.emit(time,x,z,power,q);this.water.impact(time,x,z,power,false,q.impacts);
      if(!breach&&power>.5)this.context.cameraFeedback?.(.0019,.09);
      this.lightBoost=Math.max(this.lightBoost,breach?1:power*4);
    }
  };
  update(delta:number,_elapsed:number):boolean {
    if(!this.tick(delta,KRAKEN.lifetime))return false;
    const t=this.age,q=KRAKEN_QUALITY[this.context.quality.preset];
    this.rig.update(t,q,this.entry,this.onImpact);this.rift.update(t);this.particles.update(t,q,this.context);this.water.update(t,q.impacts);
    for(let i=0;i<4;i++){
      const k=(i+1)/4,s=ease(k),x=(this.context.player.position.x-this.target.x)*(1-s),z=(this.context.player.position.z-this.target.z)*(1-s);
      this.ripple(50+i,.08+k*.5,.1,.7,4,.8,x,z);
    }
    this.ripple(54,.65,.24,1.3,6,2);this.ripple(55,8.04,.55,2.1,18,2);this.ripple(56,8.35,.35,2,12,3);this.ripple(57,9.4,-.2,1.2,4,4);
    const burst=t-KRAKEN.finale;this.flash.visible=burst>=0&&burst<.55;
    this.flash.position.y=.35;this.flash.scale.set(2+Math.max(0,burst)*14,.55+Math.max(0,burst)*2,2+Math.max(0,burst)*14);this.flashMaterial.uniforms.uFade.value=this.flash.visible?(1-ease(burst/.55))*.7:0;
    this.lightBoost*=Math.exp(-Math.max(0,delta)*6);this.light.position.set(0,3,0);this.lighting((2+this.lightBoost)*(1-ease((t-9.2)/1.5)));
    return true;
  }
}
