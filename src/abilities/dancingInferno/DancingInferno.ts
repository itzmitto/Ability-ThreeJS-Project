import type { Ability,AbilityCastContext } from '../Ability';
import type { Camera,Scene,WebGLRenderer } from 'three';
import { acquireBending,bendingTarget } from '../bending/BendingSupport';
import { BendingWarmup } from '../bending/BendingWarmup';
import { INFERNO_CONFIG } from './DancingInfernoConfig';
import { DancingInfernoEffect } from './DancingInfernoEffect';
export class DancingInferno implements Ability{
  readonly id='dancing-inferno';readonly name='DANCING INFERNO';readonly subtitle='FLAME WEAVER';readonly element='FIRE';readonly color='#ef9861';readonly icon='dancing-inferno';readonly cooldown=INFERNO_CONFIG.cooldown;readonly range=INFERNO_CONFIG.range;readonly tags=['fire','bending','inferno','dancing','flame','weaver','ribbons'];private readonly pool:DancingInfernoEffect[]=[];private warmup?:BendingWarmup;
  prepare(renderer:WebGLRenderer,camera:Camera,scene:Scene):void{if(this.warmup)return;const e=new DancingInfernoEffect();this.pool.push(e);this.warmup=new BendingWarmup(e.root,renderer,camera,scene);}
  get prepared():boolean{return this.warmup?.ready??true;}
  cast(c:AbilityCastContext):boolean{const target=bendingTarget(c,this.range);if(!target||this.pool.filter(e=>e.active).length>=2)return false;const release=acquireBending(c.effectManager);if(!release)return false;let e=this.pool.find(e=>!e.active);if(!e){e=new DancingInfernoEffect();this.pool.push(e);}e.activate(c,target,release);c.effectManager.add(e);return true;}
  dispose():void{this.warmup?.dispose();this.warmup=undefined;this.pool.forEach(e=>e.destroy());this.pool.length=0;}
}
