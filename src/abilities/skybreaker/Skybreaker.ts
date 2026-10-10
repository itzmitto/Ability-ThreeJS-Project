import type { Ability,AbilityCastContext } from '../Ability';
import { acquireBending,bendingTarget } from '../bending/BendingSupport';
import { SKY_CONFIG } from './SkybreakerConfig';
import { SkybreakerEffect } from './SkybreakerEffect';
export class Skybreaker implements Ability{
  readonly id='skybreaker';readonly name='SKYBREAKER';readonly subtitle='VACUUM CRESCENT';readonly element='AIR / WIND';readonly color='#bbc4c1';readonly icon='skybreaker';readonly cooldown=SKY_CONFIG.cooldown;readonly range=SKY_CONFIG.range;readonly tags=['air','wind','bending','vacuum','crescent','pressure'];private readonly pool:SkybreakerEffect[]=[];
  cast(c:AbilityCastContext):boolean{const target=bendingTarget(c,this.range);if(!target||this.pool.filter(e=>e.active).length>=2)return false;const release=acquireBending(c.effectManager);if(!release)return false;let e=this.pool.find(e=>!e.active);if(!e){e=new SkybreakerEffect();this.pool.push(e);}e.activate(c,target,release);c.effectManager.add(e);return true;}
  dispose():void{this.pool.forEach(e=>e.destroy());this.pool.length=0;}
}
