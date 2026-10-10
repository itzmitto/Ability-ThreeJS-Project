import type { Ability,AbilityCastContext } from '../Ability';
import { acquireBending,bendingTarget } from '../bending/BendingSupport';
import { TidalSerpentEffect } from './TidalSerpentEffect';
import { TIDAL_CONFIG } from './TidalSerpentConfig';
export class TidalSerpent implements Ability {
  readonly id='tidal-serpent';readonly name='TIDAL SERPENT';readonly subtitle='CURRENT LASH';readonly element='WATER';readonly color='#8caebc';readonly icon='tidal-serpent';
  readonly cooldown=TIDAL_CONFIG.cooldown;readonly range=TIDAL_CONFIG.range;readonly tags=['water','bending','whip','current','lash','serpent'];private readonly pool:TidalSerpentEffect[]=[];
  cast(c:AbilityCastContext):boolean{const t=bendingTarget(c,this.range);if(!t||this.pool.filter(e=>e.active).length>=2)return false;const release=acquireBending(c.effectManager);if(!release)return false;let e=this.pool.find(e=>!e.active);if(!e){e=new TidalSerpentEffect();this.pool.push(e);}e.activate(c,t,release);c.effectManager.add(e);return true;}
  dispose():void{this.pool.forEach(e=>e.destroy());this.pool.length=0;}
}
