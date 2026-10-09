import type {Vector3} from 'three';
import type {AbilityCastContext} from '../Ability';
import {PackEffect,shardGeometry,ease} from '../elemental/PackVisuals';
import {CRYO,CRYO_QUALITY} from './CryoCollapseConfig';
import {FrozenSphere} from './FrozenSphere';
import {CryoWave} from './CryoWave';
export class CryoCollapseEffect extends PackEffect{
  private readonly sphere=new FrozenSphere(this.owner);
  private readonly wave=new CryoWave(this.owner);
  constructor(context:AbilityCastContext,target:Vector3){super(context,target,'#bceeff',shardGeometry());this.update(0,context.time);}
  get particleCount():number{return this.wave.snow.mesh.count+this.wave.mist.mesh.count;}
  get instanceCount():number{return this.particleCount+this.sphere.shards.count;}
  update(delta:number,_elapsed:number):boolean{
    if(!this.tick(delta,CRYO.lifetime))return false;const t=this.age,q=CRYO_QUALITY[this.context.quality.preset],fade=1-ease((t-7.2)/.8);
    this.sphere.update(t,q.rings,q.shards,q.detail,q.layers,fade);this.wave.update(t,q.snow,q.mist,q.detail,fade,this.context);this.light.position.y=t<4.2?9:2;this.lighting((t<4.2?ease((t-1)/2)*12:(1-ease((t-4.2)/2.5))*28)*fade);
    this.ripple(0,.3,.12,2,3);this.ripple(1,1.1,-.16,2,3,4);this.ripple(2,3.5,-.3,.8,2,2);if(this.ripple(3,4.2,.75,3.7,12,2))this.context.cameraFeedback?.(.0055,.24);this.ripple(4,4.65,.3,3.2,10,4);
    for(let i=0;i<(q.detail===3?6:3);i++){const a=i*2.39996;this.ripple(10+i,5.6+i*.16,.2,1.2,6,1,Math.cos(a)*(8+i),Math.sin(a)*(8+i));}this.ripple(30,7,.12,.9,5);
    return true;
  }
}
