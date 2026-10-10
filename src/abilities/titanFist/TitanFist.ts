import type { Ability,AbilityCastContext } from '../Ability';
import { acquireBending,bendingTarget } from '../bending/BendingSupport';
import { TITAN_CONFIG } from './TitanFistConfig';
import { TitanFistEffect } from './TitanFistEffect';
export class TitanFist implements Ability{
  readonly id='titan-fist';readonly name='TITAN FIST';readonly subtitle='SEISMIC STRIKE';readonly element='EARTH / STONE';readonly color='#a0b1a7';readonly icon='titan-fist';readonly cooldown=TITAN_CONFIG.cooldown;readonly range=TITAN_CONFIG.range;readonly tags=['earth','stone','bending','fist','punch','seismic'];private readonly pool:TitanFistEffect[]=[];
  cast(c:AbilityCastContext):boolean{const target=bendingTarget(c,this.range);if(!target||this.pool.filter(e=>e.active).length>=2)return false;const release=acquireBending(c.effectManager);if(!release)return false;let e=this.pool.find(e=>!e.active);if(!e){e=new TitanFistEffect();this.pool.push(e);}e.activate(c,target,release);c.effectManager.add(e);return true;}
  dispose():void{this.pool.forEach(e=>e.destroy());this.pool.length=0;}
}
