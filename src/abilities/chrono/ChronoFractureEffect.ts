import {InstancedMesh,Object3D} from 'three';
import type {Vector3} from 'three';
import type {AbilityCastContext} from '../Ability';
import {PackEffect,shardGeometry} from '../elemental/PackVisuals';
import {CHRONO_FRACTURE,CHRONO_QUALITY} from './ChronoFractureConfig';
import {chronoTimeline} from './ChronoTimeline';
import {TemporalClock} from './TemporalClock';
import {TemporalParticles} from './TemporalParticles';
import {TemporalField} from './TemporalField';
import {TimeFracture} from './TimeFracture';
import {TemporalShatter} from './TemporalShatter';
import {clockHandPiece} from './ClockRingGeometry';
import {packMaterial} from '../elemental/PackVisuals';
export class ChronoFractureEffect extends PackEffect{
  private readonly clock:TemporalClock;
  private readonly particles:TemporalParticles;
  private readonly fracture:TimeFracture;
  private readonly field=new TemporalField(this.owner);
  private readonly shatter=new TemporalShatter(this.owner);
  private readonly chargeHands:InstancedMesh;
  private readonly chargeMaterial;
  private readonly chargeTransform=new Object3D();
  constructor(context:AbilityCastContext,target:Vector3){
    super(context,target,'#e6cd89',shardGeometry());this.clock=new TemporalClock(this.owner,context,target);this.particles=new TemporalParticles(this.owner,this.clock.root);this.fracture=new TimeFracture(this.owner,this.clock.root);this.light.distance=45;
    this.chargeMaterial=this.owner.material(packMaterial('#e9d39b',true));this.chargeHands=new InstancedMesh(this.owner.geometry(clockHandPiece(1,2)),this.chargeMaterial,2);this.chargeHands.frustumCulled=false;this.aura.add(this.chargeHands);this.update(0,context.time);
  }
  get particleCount():number{return this.particles.particles.mesh.count;}
  get instanceCount():number{let n=this.particleCount+12+this.shatter.arcs.count;for(const m of this.clock.rings)if(m.visible)n+=m.count;for(const m of [...this.clock.hands,...this.clock.ghosts,...this.fracture.meshes])n+=m.count;return n;}
  update(delta:number,_elapsed:number):boolean{
    if(!this.tick(delta,CHRONO_FRACTURE.lifetime))return false;const t=this.age,q=CHRONO_QUALITY[this.context.quality.preset],s=chronoTimeline(t);
    this.clock.update(t,s,q.rings,q.segments,q.hands,q.ghosts,q.detail);this.particles.update(t,s,q.particles,this.context);this.fracture.update(t,s,q.fragments);this.field.update(t,s);this.shatter.update(t,s,q.detail);
    for(let i=0;i<2;i++){this.chargeTransform.position.set(0,0,0);this.chargeTransform.rotation.set(0,0,t*(i===0?3:1));this.chargeTransform.scale.setScalar(.12);this.chargeTransform.updateMatrix();this.chargeHands.setMatrixAt(i,this.chargeTransform.matrix);}this.chargeHands.instanceMatrix.needsUpdate=true;this.chargeMaterial.uniforms.uTime.value=s.time;
    this.ripple(0,.25,.12,1,4,2);this.ripple(1,1.15,.2,1,6,3);this.ripple(2,1.85,.23,.35,7,3);this.ripple(3,2.15,.22,.22,8,2);this.ripple(4,3.2,-.2,.8,3,4);this.ripple(5,4.2,-.32,.9,3,3);this.ripple(6,5.3,-.4,.45,2,2);
    if(this.ripple(7,5.8,.9,2.1,16,2))this.context.cameraFeedback?.(.0058,.23);this.ripple(8,6.05,.45,1.85,19,3);this.ripple(9,6.7,.2,1.25,9,3);
    this.light.color.setRGB(1-s.blue*.45,.81+s.blue*.08,.4+s.blue*.6);if(t<.7)this.light.position.copy(this.hand).sub(this.target);else this.light.position.set(0,t<5.8?9:3,0);this.lighting((t<5.8?5+s.build*11+s.collapse*9:30*(1-Math.min(1,(t-5.8)/2.2)))*s.fade);
    return true;
  }
}
