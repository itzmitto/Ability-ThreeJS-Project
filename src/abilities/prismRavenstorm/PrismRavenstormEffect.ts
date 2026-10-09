import { Group, InstancedMesh, Object3D, Vector3 } from 'three';
import type { InstancedBufferAttribute } from 'three';
import type { AbilityCastContext } from '../Ability';
import { PackEffect, shardGeometry } from '../elemental/PackVisuals';
import { ease } from '../elemental/ElementalVisuals';
import { PRISM_RAVENSTORM, RAVENSTORM_QUALITY } from './PrismRavenstormConfig';
import { PrismProjectileSystem } from './PrismProjectileSystem';
import type { PrismShot } from './PrismProjectileSystem';
import { PrismTrails } from './PrismTrails';
import { PrismImpacts } from './PrismImpacts';
import { prismBoltGeometry } from './PrismCrystalGeometry';
export class PrismRavenstormEffect extends PackEffect {
  private readonly projectiles:PrismProjectileSystem;
  private readonly trails:PrismTrails;
  private readonly impacts:PrismImpacts;
  private readonly channel=new Group();
  private readonly core:InstancedMesh;
  private readonly coreAttributes:InstancedBufferAttribute;
  private readonly chargeTransform=new Object3D();
  private readonly handLocal=new Vector3();
  private readonly cameraLocal=new Vector3();
  constructor(context:AbilityCastContext,target:Vector3){
    super(context,target,'#c4bfee',shardGeometry());
    // Fix the total at cast time so changing presets cannot replay old launches or exceed a pool.
    const budget=RAVENSTORM_QUALITY[context.quality.preset];this.projectiles=new PrismProjectileSystem(this.owner,budget);this.trails=new PrismTrails(this.owner,this.projectiles);this.impacts=new PrismImpacts(this.owner,budget);
    const g=this.owner.geometry(prismBoltGeometry(1,13));this.coreAttributes=g.getAttribute('aBolt') as InstancedBufferAttribute;this.core=new InstancedMesh(g,this.projectiles.material,13);this.core.frustumCulled=false;this.channel.add(this.core);this.owner.root.add(this.channel);this.light.distance=34;this.update(0,context.time);
  }
  get particleCount():number{return this.impacts.dust.mesh.count+this.impacts.shards.count;}
  get instanceCount():number{return this.projectiles.meshes.reduce((n,m)=>n+m.count,0)+this.trails.mesh.count+this.impacts.flashes.count+this.particleCount+13;}
  private readonly onHit=(shot:PrismShot):void=>this.impacts.hit(shot,this.context,this.target,this);
  update(delta:number,_elapsed:number):boolean {
    if(!this.tick(delta,PRISM_RAVENSTORM.lifetime))return false;
    const t=this.age;this.handLocal.copy(this.hand).sub(this.target);this.cameraLocal.copy(this.context.camera.position).sub(this.target);
    this.projectiles.update(t,this.handLocal,this.onHit);this.trails.update(t,this.cameraLocal);this.impacts.update(t,this.context);
    this.channel.position.copy(this.handLocal);this.channel.visible=t<6.65;
    const charge=ease(t/.3)*(1-ease((t-6.3)/.35)),d=this.chargeTransform;
    for(let i=0;i<13;i++){const a=i*2.39996+t*3;d.position.set(i===0?0:Math.cos(a)*.33,i===0?0:Math.sin(a*1.4)*.24,i===0?0:Math.sin(a)*.33);d.rotation.set(t*2+i,t*3+i,t+i);d.scale.setScalar((i===0?.13:.035)*charge);d.updateMatrix();this.core.setMatrixAt(i,d.matrix);this.coreAttributes.setXYZW(i,charge,i===0?2.3:1,(i*.618+t*.045)%1,i/13);}
    this.core.instanceMatrix.needsUpdate=true;this.coreAttributes.needsUpdate=true;
    if(this.ripple(0,PRISM_RAVENSTORM.pulse,.65,1.2,15,1.5))this.context.cameraFeedback?.(.0035,.16);
    this.ripple(1,7.3,.25,.65,11,2);
    if(t<6.55)this.light.position.copy(this.handLocal);else this.light.position.set(0,1.2,0);
    this.light.color.setHSL((t*.065+.55)%1,.38,.8);this.lighting((t<6.55?(t>5.75?10:4):16*(1-ease((t-7.05)/.95)))*(1-ease((t-7.6)/.4)));
    return true;
  }
}
