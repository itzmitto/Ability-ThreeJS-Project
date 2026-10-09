import { InstancedBufferAttribute, InstancedMesh, Object3D, PlaneGeometry, PointLight, Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import { PackEffect, shardGeometry } from '../elemental/PackVisuals';
import { ease } from '../elemental/ElementalVisuals';
import { DRAGONFIRE, DRAGONFIRE_QUALITY } from './DragonfireConfig';
import { combustionMaterial, FireStream } from './FireStream';
import type { FirePacket } from './FireStream';
import { FireParticles } from './FireParticles';
import { FireImpact } from './FireImpact';
export class DragonfireEffect extends PackEffect {
  private readonly stream:FireStream;private readonly particles:FireParticles;private readonly impact:FireImpact;
  private readonly handLocal=new Vector3();
  private readonly impactLight=new PointLight('#ff9a32',0,18,2);
  private readonly charge:InstancedMesh;private readonly chargeMaterial;private readonly chargeAttributes:InstancedBufferAttribute;
  private readonly chargeTransform=new Object3D();private lastRipple=-100;
  constructor(context:AbilityCastContext,target:Vector3){
    super(context,target,'#ff973b',shardGeometry());const q=DRAGONFIRE_QUALITY[context.quality.preset];
    this.handLocal.copy(context.origin).sub(target);this.stream=new FireStream(this.owner,q,this.handLocal);this.particles=new FireParticles(this.owner,q);this.impact=new FireImpact(this.owner,q);this.owner.root.add(this.impactLight);
    const g=this.owner.geometry(new PlaneGeometry(1,1,2,6));this.chargeAttributes=new InstancedBufferAttribute(new Float32Array(3*4),4);g.setAttribute('aFire',this.chargeAttributes);this.chargeMaterial=this.owner.material(combustionMaterial());this.charge=new InstancedMesh(g,this.chargeMaterial,3);this.charge.frustumCulled=false;this.owner.root.add(this.charge);this.update(0,context.time);
  }
  get particleCount():number{return this.particles.flames.count+this.particles.sparks.mesh.count+this.particles.smoke.mesh.count+this.impact.steam.mesh.count;}
  get instanceCount():number{return this.stream.mesh.count+this.particleCount+this.impact.tongues.count+3;}
  private readonly onLaunch=(p:FirePacket):void=>this.particles.emit(p);
  private readonly onHit=(p:FirePacket):void=>{
    const time=p.birth+p.duration;this.impact.hit(p,time);
    if(time-this.lastRipple>=.18){this.lastRipple=time;this.point.copy(this.target).add(p.end);this.context.water?.addRipple({position:this.point,strength:.17,duration:.85,waveSpeed:6,wavelength:.55,radius:.55},this);}
  };
  update(delta:number,_elapsed:number):boolean {
    if(!this.tick(delta,DRAGONFIRE.lifetime))return false;const t=this.age,q=DRAGONFIRE_QUALITY[this.context.quality.preset];
    this.handLocal.copy(this.hand).sub(this.target);this.stream.update(t,this.handLocal,this.onLaunch,this.onHit);this.particles.update(t,this.context);this.impact.update(t,this.context);
    this.charge.visible=t<.6;this.chargeMaterial.uniforms.uTime.value=t;
    const d=this.chargeTransform,fade=ease(t/.12)*(1-ease((t-.35)/.25));
    for(let i=0;i<3;i++){d.position.copy(this.handLocal);d.position.y+=.14;d.rotation.set(.2,i*Math.PI/3,t*.3);d.scale.set(.24,.5,1);d.updateMatrix();this.charge.setMatrixAt(i,d.matrix);this.chargeAttributes.setXYZW(i,fade*.7,i*.23,.9,t);}
    this.charge.instanceMatrix.needsUpdate=true;this.chargeAttributes.needsUpdate=true;
    this.light.position.copy(this.handLocal);this.lighting(4*ease(t/.15)*(1-ease((t-2.2)/.3)));
    this.impactLight.position.copy(this.impact.centre);this.impactLight.position.y+=.9;this.impactLight.intensity=Number.isFinite(this.impact.firstHit)?(q.layers===3?3.5:9)*(1-ease((t-this.impact.lastHit-.1)/.7))*(1-ease((t-3.5)/.5)):0;
    this.impactLight.visible=this.impactLight.intensity>.001;
    return true;
  }
}
