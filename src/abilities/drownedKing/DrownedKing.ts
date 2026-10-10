import { Vector3 } from 'three';
import type { Ability,AbilityCastContext } from '../Ability';
import { KING_CAST,KING_DEFAULTS,validateKingConfig,type KingConfig } from './DrownedKingConfig';
import { DrownedKingEffect } from './DrownedKingEffect';
export function drownedKingTarget(ctx:AbilityCastContext):Vector3|null{
  if(!ctx.origin.toArray().every(Number.isFinite))return null;const source=ctx.groundTarget??ctx.targetPoint,target=new Vector3();
  if(source&&source.toArray().every(Number.isFinite))target.copy(source);else{const d=ctx.cameraForward;if(!d.toArray().every(Number.isFinite)||d.lengthSq()<1e-8)return null;target.copy(ctx.origin).addScaledVector(d.clone().normalize(),KING_CAST.range);}
  const d=target.clone().sub(ctx.origin);d.y=0;const distance=d.length();if(!Number.isFinite(distance)||distance<.5)return null;
  if(distance>KING_CAST.range)target.copy(ctx.origin).addScaledVector(d.normalize(),KING_CAST.range);target.y=ctx.water?.getSurfaceHeight(target.x,target.z)??0;return target;
}
export class DrownedKing implements Ability {
  readonly id='drowned-king';readonly name='THE DROWNED KING';readonly subtitle='THRONEBREAKER';readonly element='ABYSSAL / CURSED METAL / DARK WATER';readonly color='#79cabb';readonly icon='drowned-king';readonly cooldown=KING_CAST.cooldown;readonly range=KING_CAST.range;
  readonly tags=['abyssal','dark','king','knight','crown','runeblade','summon'];private controls={...KING_DEFAULTS};private effect?:DrownedKingEffect;
  get config():Readonly<KingConfig>{return this.controls;}get activeCount():number{return this.effect?.active?1:0;}
  configure(patch:Partial<KingConfig>):void{if(this.activeCount)throw new Error('King tuning applies between casts');this.controls=validateKingConfig(patch,this.controls);}
  cast(ctx:AbilityCastContext):boolean{if(this.activeCount)return false;const target=drownedKingTarget(ctx);if(!target)return false;this.effect??=new DrownedKingEffect(ctx,this.controls);ctx.player.visual.beginRightHandCast(1.5,1.1);this.effect.activate(ctx,target,this.controls);ctx.effectManager.add(this.effect);return true;}
  dispose():void{this.effect?.destroy();this.effect=undefined;}
}
