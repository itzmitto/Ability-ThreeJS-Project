import type { Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import { PackEffect,ease } from '../elemental/PackVisuals';
import { WORLDROOT,ROOT_QUALITY } from './WorldrootConfig';
import { WorldrootGrowth } from './WorldrootGrowth';
import { WorldrootImpact,leafGeometry } from './WorldrootImpact';
export class WorldrootEffect extends PackEffect {
  private readonly growth=new WorldrootGrowth(this.owner);
  private readonly impact=new WorldrootImpact(this.owner);
  constructor(context:AbilityCastContext,target:Vector3){super(context,target,'#93c875',leafGeometry());this.update(0,context.time);}
  get particleCount():number{return this.impact.leaves.count+this.impact.spores.mesh.count+this.impact.splash.mesh.count;}
  get instanceCount():number{return this.particleCount+this.impact.bark.count+this.growth.thorns.count;}
  update(delta:number,_elapsed:number):boolean{
    if(!this.tick(delta,WORLDROOT.lifetime))return false;const t=this.age,q=ROOT_QUALITY[this.context.quality.preset],fade=1-ease((t-6.8)/1.2);
    this.growth.update(t,q.roots,q.vines,q.thorns,q.detail,fade);this.impact.update(t,q.leaves,q.spores,q.bark,fade,this.context);this.lighting((t<4.65?ease((t-3)/1.65)*10:(1-ease((t-4.65)/2.2))*20)*fade);
    this.ripple(0,.3,.2,2,4,3);
    for(let i=0;i<q.roots;i++){const a=i*2.39996;this.ripple(10+i,.8+i*.075,.35,2,6,1,Math.cos(a)*6.8,-Math.sin(a)*6.8);}
    this.ripple(30,3.2,.3,1.7,6,2);if(this.ripple(31,4.65,.9,3.2,14,2))this.context.cameraFeedback?.(.006,.24);this.ripple(32,4.95,.5,2.8,17,3);this.ripple(33,5.6,.25,2.1,9,2);
    return true;
  }
}
