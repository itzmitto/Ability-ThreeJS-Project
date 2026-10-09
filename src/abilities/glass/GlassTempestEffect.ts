import type { Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import { PackEffect, shardGeometry, ease, hash } from '../elemental/PackVisuals';
import { GLASS_TEMPEST,GLASS_QUALITY } from './GlassTempestConfig';
import { GlassTempestVisuals } from './GlassTempestVisuals';
import { GlassTempestImpact } from './GlassTempestImpact';
export class GlassTempestEffect extends PackEffect {
  private readonly storm=new GlassTempestVisuals(this.owner);
  private readonly impact=new GlassTempestImpact(this.owner);
  constructor(context:AbilityCastContext,target:Vector3){super(context,target,'#ddbc77',shardGeometry());this.update(0,context.time);}
  get particleCount():number{return this.impact.sand.mesh.count+this.impact.dust.mesh.count+this.impact.sparkle.mesh.count;}
  get instanceCount():number{return this.particleCount+this.impact.shards.count+this.storm.trails.count;}
  update(delta:number,_elapsed:number):boolean{
    if(!this.tick(delta,GLASS_TEMPEST.lifetime))return false;const t=this.age,q=GLASS_QUALITY[this.context.quality.preset],fade=1-ease((t-5.8)/1.2);
    this.storm.update(t,q.ribbons,q.blades,fade);this.impact.update(t,q.shards,q.sand,q.dust,fade,this.context);this.lighting((t<4.4?ease((t-3.4)/1)*8:(1-ease((t-4.4)/1.7))*18)*fade);
    this.ripple(0,.3,.2,2,4);this.ripple(1,1.1,.26,2,5);
    for(let i=0;i<q.blades;i++){const a=i*2.39996;this.ripple(10+i,2.82+i*.085,.3,1.2,8,1,Math.cos(a)*hash(i)*2,Math.sin(a)*hash(i)*2);}
    if(this.ripple(30,4.4,.8,2.6,15,2))this.context.cameraFeedback?.(.0045,.2);this.ripple(31,4.7,.4,2.2,18,3);this.ripple(32,5.3,.2,1.6,8);
    return true;
  }
}
