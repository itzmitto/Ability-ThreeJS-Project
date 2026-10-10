import { Group, PointLight, Quaternion, Vector3 } from 'three';
import type { ManagedEffect } from '../../effects/EffectManager';
import type { AbilityCastContext } from '../Ability';
import { KING_CAST,kingPhase,kingQuality,smooth,type KingConfig,type KingPhase,type KingQuality } from './DrownedKingConfig';
import { DrownedKingRig } from './DrownedKingRig';
import { DrownedKingCape } from './DrownedKingCape';
import { DrownedKingSword } from './DrownedKingSword';
import { DrownedKingOcean } from './DrownedKingOcean';
import { DrownedKingParticles } from './DrownedKingParticles';

export class DrownedKingEffect implements ManagedEffect {
  readonly root=new Group();readonly rig=new DrownedKingRig();readonly cape=new DrownedKingCape();readonly sword=new DrownedKingSword();
  readonly ocean=new DrownedKingOcean();readonly particles=new DrownedKingParticles();readonly light=new PointLight('#78dfcc',0,150,2);
  readonly target=new Vector3();readonly origin=new Vector3();readonly strikeStart=new Vector3();readonly strikeEnd=new Vector3();readonly midpoint=new Vector3();
  readonly bladeContact=new Vector3();private readonly forward=new Vector3();private readonly hand=new Vector3();private readonly grip=new Quaternion();
  private context:AbilityCastContext;private config:KingConfig;private quality:KingQuality;private unsubscribe?:()=>void;private age=0;private emitted=false;private handsEmitted=false;private destroyed=false;
  active=false;phase:KingPhase='complete';
  constructor(ctx:AbilityCastContext,c:Readonly<KingConfig>){this.context=ctx;this.config={...c};this.quality=kingQuality(ctx.quality.config,c);
    this.rig.torso.add(this.cape.mesh,this.sword.root);this.root.name='Drowned King · reusable ultimate';this.root.add(this.rig.root,this.ocean.root,this.particles.root,this.light);}
  activate(ctx:AbilityCastContext,target:Vector3,c:Readonly<KingConfig>):void{
    this.context=ctx;this.config={...c};this.target.copy(target);this.age=0;this.emitted=this.handsEmitted=false;this.active=true;this.phase='awakening';
    this.forward.subVectors(ctx.player.position,target).setY(0);if(this.forward.lengthSq()<.01)this.forward.copy(ctx.cameraForward).negate().setY(0);this.forward.normalize();
    const scale=c.kingHeight/85,bladeLength=60*c.swordLength/65/scale,reach=35+Math.sqrt(Math.max(1,bladeLength*bladeLength-24*24));this.origin.copy(target).addScaledVector(this.forward,-reach*scale);this.rig.root.rotation.y=Math.atan2(this.forward.x,this.forward.z);this.rig.root.scale.setScalar(scale);
    this.strikeStart.copy(this.origin);this.strikeEnd.copy(this.origin).addScaledVector(this.forward,c.splitLength);this.midpoint.copy(this.strikeStart).lerp(this.strikeEnd,.5);
    ctx.scene.add(this.root);this.unsubscribe=ctx.quality.subscribe(q=>{this.quality=kingQuality(q,this.config);this.light.visible=this.quality.lights;});this.update(0);
    ctx.water?.addRipple({position:this.origin,strength:-.3,duration:3.5,waveSpeed:4,wavelength:2.5,radius:22,displacementScale:1.4,attenuation:.025},this);
    ctx.water?.addRipple({position:this.target,strength:-.2,duration:3,waveSpeed:3,wavelength:2,radius:18,displacementScale:1,attenuation:.025},this);
  }
  update(dt:number):boolean{
    if(!this.active||!Number.isFinite(dt)||dt<0)return this.active;if(dt>30)return false;this.age+=dt;const t=this.age,c=this.config,q=this.quality;this.phase=kingPhase(t);this.root.userData.phase=this.phase;if(this.phase==='complete')return false;
    const scale=c.kingHeight/85,emerge=smooth((t-1.5)/2.5),collapse=smooth((t-11.5)/3),charge=smooth((t-6)/2);
    const surface=this.context.water?.getSurfaceHeight(this.origin.x,this.origin.z)??0;
    this.origin.y=surface;
    this.target.y=this.context.water?.getSurfaceHeight(this.target.x,this.target.z)??0;
    this.rig.root.position.copy(this.origin);this.rig.root.position.y=surface+(-102+74*emerge-72*collapse)*scale;
    this.rig.root.visible=t>=1.5&&t<15;this.rig.torso.rotation.y=Math.sin(t*.4)*.025*(1-collapse)*(1-smooth((t-7.5)/.5));
    this.sword.pose(t,c,(this.target.y-surface)/scale);
    const gripProgress=smooth((t-4.7)/1.3),openPose=1-gripProgress;
    for(let side=0;side<2;side++){
      this.sword.handTarget(side,this.hand);if(openPose>0){const sign=side?1:-1;this.hand.lerp(this.bladeContact.set(sign*24,101-53*emerge,15),openPose);}
      this.grip.copy(this.sword.orientation);this.rig.reach(side,this.hand,this.grip,gripProgress*(1-collapse));
    }
    this.rig.update(t,c,q.tier,charge);this.cape.update(t,c,1-smooth((t-12)/3));this.sword.update(t,c,q);
    this.rig.root.updateWorldMatrix(true,true);this.bladeContact.copy(this.sword.tip).applyMatrix4(this.rig.torso.matrixWorld);
    this.strikeStart.y=this.context.water?.getSurfaceHeight(this.strikeStart.x,this.strikeStart.z)??0;this.strikeEnd.y=this.context.water?.getSurfaceHeight(this.strikeEnd.x,this.strikeEnd.z)??0;
    this.midpoint.y=this.context.water?.getSurfaceHeight(this.midpoint.x,this.midpoint.z)??0;
    this.ocean.update(t,this.midpoint,this.target,c,q,this.rig.root.rotation.y);this.particles.update(t,this.midpoint,this.origin,this.forward,c,q);
    if(t<9)this.sword.weapon.getWorldPosition(this.light.position);else{this.light.position.copy(this.target);this.light.position.y+=10;}this.light.intensity=t<9?charge*4:35*Math.exp(-(t-9)*3);
    this.context.skyFraming?.(.14*smooth((t-1.5)/2)*(1-smooth((t-10)/3)),.12,8*smooth((t-1.5)/2)*(1-smooth((t-10)/3)));
    if(!this.handsEmitted&&t>=2.5){this.handsEmitted=true;for(const arm of this.rig.arms){arm.hand.getWorldPosition(this.hand);this.hand.y=this.context.water?.getSurfaceHeight(this.hand.x,this.hand.z)??0;this.context.water?.addRipple({position:this.hand,strength:.32,duration:2,waveSpeed:9,wavelength:1.8,displacementScale:1.7,attenuation:.025},this);}}
    if(!this.emitted&&t>=KING_CAST.impact){this.emitted=true;
      this.context.water?.addSplit({start:this.strikeStart,end:this.strikeEnd,width:c.splitWidth,depth:2,duration:c.waterWallDuration},this);
      for(let i=0;i<4;i++)this.context.water?.addRipple({position:this.target,strength:.32/(1+i*.2),duration:3.2,waveSpeed:15+i*3,wavelength:2.4+i*.4,radius:i,displacementScale:2,attenuation:.02},this);
      this.context.cameraFeedback?.(.004,.2);
    }
    return true;
  }
  get particleCount():number{return this.particles.particleCount;}
  get instanceCount():number{return (this.rig.root.visible?this.rig.instanceCount:0)+this.sword.instanceCount;}
  dispose():void{if(!this.active)return;this.active=false;this.phase='complete';this.unsubscribe?.();this.unsubscribe=undefined;this.context.water?.removeOwner(this);this.root.removeFromParent();this.light.intensity=0;}
  destroy():void{if(this.destroyed)return;this.destroyed=true;this.dispose();this.cape.dispose();this.sword.dispose();this.rig.dispose();this.ocean.dispose();this.particles.dispose();this.light.dispose();this.root.clear();}
}
