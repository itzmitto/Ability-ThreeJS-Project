import { Vector3 } from 'three';
import type { Camera, Scene, WebGLRenderer } from 'three';
import type { GraphicsSettings } from '../../quality/GraphicsSettings';
import { RiftWarmup } from './RiftWarmup';
import type { Ability, AbilityCastContext } from '../Ability';
import { RIFT_CAST, RIFT_DEFAULTS, validateRiftConfig, type RiftConfig } from './RiftreaverConfig';
import { createRiftResources, disposeRiftResources, type RiftResources } from './RiftGeometry';
import { RiftreaverEffect } from './RiftreaverEffect';
export function riftTarget(ctx:AbilityCastContext):Vector3|null{
  if(!ctx.origin.toArray().every(Number.isFinite))return null;
  const target=new Vector3(),source=ctx.groundTarget??ctx.targetPoint;
  if(source?.toArray().every(Number.isFinite))target.copy(source);
  else {if(!ctx.cameraForward.toArray().every(Number.isFinite)||ctx.cameraForward.lengthSq()<1e-8)return null;target.copy(ctx.origin).addScaledVector(ctx.cameraForward.clone().normalize(),RIFT_CAST.range);}
  // Ground range is measured horizontally; the upright tear remains attached to sampled ocean height.
  const d=target.clone().sub(ctx.origin);d.y=0;if(d.length()<.3)return null;
  if(d.length()>RIFT_CAST.range)target.copy(ctx.origin).addScaledVector(d.normalize(),RIFT_CAST.range);
  target.y=ctx.water?.getSurfaceHeight(target.x,target.z)??target.y;return target;
}
export class Riftreaver implements Ability {
  readonly id='riftreaver';readonly name='RIFTREAVER';readonly subtitle='SCAR OF REALITY';readonly element='VOID / DIMENSIONAL';
  readonly icon='riftreaver';readonly color='#b69aea';readonly cooldown=RIFT_CAST.cooldown;readonly range=RIFT_CAST.range;
  readonly tags=['rift','reaver','riftreaver','scar','reality','void','dimensional','spatial','slash'];
  private readonly controls={...RIFT_DEFAULTS};private resources?:RiftResources;private warmup?:RiftWarmup;private readonly pool:RiftreaverEffect[]=[];
  get activeCount():number{return this.pool.filter(e=>e.active).length;}
  get config():Readonly<RiftConfig>{return this.controls;}
  configure(patch:Partial<RiftConfig>):void{if(this.activeCount)throw new Error('Riftreaver tuning applies between casts');const next=validateRiftConfig(patch,this.controls);this.dispose();Object.assign(this.controls,next);}
  prepare(renderer:WebGLRenderer,camera:Camera,scene:Scene,settings:GraphicsSettings):void{if(this.warmup)return;this.resources??=createRiftResources(this.controls);this.warmup=new RiftWarmup(this.resources,this.controls,renderer,camera,scene,settings);}
  cast(ctx:AbilityCastContext):boolean{
    const target=riftTarget(ctx);if(!target||this.activeCount>=RIFT_CAST.maximumActive)return false;
    this.resources??=createRiftResources(this.controls);let e=this.pool.find(effect=>!effect.active);
    if(!e){e=new RiftreaverEffect(ctx,this.resources,this.controls);this.pool.push(e);}
    e.activate(ctx,target);ctx.effectManager.add(e);return true;
  }
  dispose():void{this.warmup?.dispose();this.warmup=undefined;this.pool.forEach(e=>e.destroy());this.pool.length=0;if(this.resources)disposeRiftResources(this.resources);this.resources=undefined;}
}
