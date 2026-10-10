import { Group, Mesh, PointLight, Quaternion, Vector3 } from 'three';
import type { ManagedEffect } from '../../effects/EffectManager';
import type { AbilityCastContext } from '../Ability';
import { RIFT_CAST, riftEase, riftPhase, riftQuality, type RiftConfig, type RiftQuality } from './RiftreaverConfig';
import { riftBoundary, type RiftResources } from './RiftGeometry';
import { createRiftEdgeMaterial, createRiftEnergyMaterial, createRiftVoidMaterial } from './RiftMaterials';
import { RiftShards } from './RiftShards';
import { RiftParticles } from './RiftParticles';
import { DimensionalSlashes } from './DimensionalSlashes';
import { RiftImpact } from './RiftImpact';

export class RiftreaverEffect implements ManagedEffect {
  readonly root=new Group();readonly fracture=new Group();readonly incision=new Group();
  readonly edge;readonly energy=createRiftEnergyMaterial();readonly flashMaterial=createRiftEnergyMaterial();readonly voidMaterial;readonly left:Mesh;readonly right:Mesh;readonly interior:Mesh;
  readonly glowLeft:Mesh;readonly glowRight:Mesh;readonly branches:Mesh[]=[];readonly flash=new Group();
  readonly shards:RiftShards;readonly particles=new RiftParticles();readonly slashes:DimensionalSlashes;readonly impact=new RiftImpact();
  readonly light=new PointLight('#9476dc',0,23,2);readonly target=new Vector3();readonly origin=new Vector3();readonly direction=new Vector3();readonly position=new Vector3();
  private readonly branchPositions=new Float32Array(30);private readonly hand=new Vector3();private readonly normal=new Vector3();private readonly heading=new Quaternion();
  private ctx:AbilityCastContext;private q:RiftQuality;private unsubscribe?:()=>void;private age=0;private launched=false;private collapsed=false;private destroyed=false;
  arrival=Infinity;active=false;phase='complete';
  constructor(ctx:AbilityCastContext,private readonly resources:RiftResources,private readonly c:RiftConfig){
    this.ctx=ctx;this.q=riftQuality(ctx.quality.config);this.edge=createRiftEdgeMaterial(c);this.voidMaterial=createRiftVoidMaterial(c);
    const r=resources.tiers[this.q.detail];this.left=new Mesh(r.left,this.edge.material);this.right=new Mesh(r.right,this.edge.material);this.interior=new Mesh(r.interior,this.voidMaterial);
    this.glowLeft=new Mesh(r.glowLeft,this.energy);this.glowRight=new Mesh(r.glowRight,this.energy);this.glowLeft.position.z=this.glowRight.position.z=.65;
    this.fracture.add(this.left,this.right,this.interior,this.glowLeft,this.glowRight);
    for(let i=0;i<10;i++){this.branchPositions.set(riftBoundary(.15+(i/10)*.7,i%2?1:-1,c),i*3);const m=new Mesh(resources.slash,this.edge.material);this.fracture.add(m);this.branches.push(m);}
    for(let i=0;i<3;i++){const m=new Mesh(resources.slash,this.flashMaterial);m.rotation.z=i*Math.PI/3;m.scale.set(.12,4.2,.3);this.flash.add(m);}
    const body=new Mesh(resources.slash,this.edge.material),line=new Mesh(resources.slash,this.energy);line.scale.set(.055,1,1.1);line.position.z=.025;this.incision.add(body,line);
    this.shards=new RiftShards(resources,c);this.slashes=new DimensionalSlashes(resources,c);this.root.add(this.shards.root,this.particles.mesh);
    this.root.name='Riftreaver · bounded pooled fracture';this.incision.name='Traveling incision';this.fracture.name='Jagged reality fracture';this.root.add(this.fracture,this.incision,this.slashes.root,this.impact.root,this.light,this.flash);
    this.root.traverse(o=>o.frustumCulled=false);
  }
  activate(ctx:AbilityCastContext,target:Vector3):void{
    this.ctx=ctx;this.target.copy(target);this.origin.copy(ctx.origin);this.position.copy(ctx.origin);this.age=0;this.arrival=Infinity;this.launched=this.collapsed=false;this.active=true;this.phase='incision';this.slashes.reset();this.impact.root.visible=false;
    this.normal.subVectors(ctx.origin,target);this.normal.y=0;if(this.normal.lengthSq()<1e-8)this.normal.set(0,0,1);this.normal.normalize();this.heading.setFromAxisAngle(new Vector3(0,1,0),Math.atan2(this.normal.x,this.normal.z));
    this.fracture.position.copy(target);this.fracture.quaternion.copy(this.heading);ctx.scene.add(this.root);
    this.unsubscribe=ctx.quality.subscribe(q=>{this.q=riftQuality(q);const r=this.resources.tiers[this.q.detail];this.left.geometry=r.left;this.right.geometry=r.right;this.interior.geometry=r.interior;this.glowLeft.geometry=r.glowLeft;this.glowRight.geometry=r.glowRight;this.light.visible=this.q.light;});
    this.update(0);
  }
  update(dt:number):boolean{
    if(!this.active)return false;if(!Number.isFinite(dt)||dt<0)return true;if(dt>30)return false;this.age+=dt;
    if(!this.launched){this.ctx.player.visual.getRightHandWorldPosition(this.hand);this.position.copy(this.hand);
      if(this.age>=RIFT_CAST.release){this.launched=true;this.origin.copy(this.hand);this.direction.subVectors(this.target,this.origin);const distance=Math.min(RIFT_CAST.range,this.direction.length());if(!Number.isFinite(distance)||distance<.05)return false;
        this.direction.normalize();this.target.copy(this.origin).addScaledVector(this.direction,distance);this.target.y=this.ctx.water?.getSurfaceHeight(this.target.x,this.target.z)??this.target.y;
        this.direction.subVectors(this.target,this.origin);const actual=this.direction.length();this.direction.normalize();this.arrival=RIFT_CAST.release+actual/RIFT_CAST.speed;this.fracture.position.copy(this.target);this.ctx.cameraFeedback?.(.005,.07);
      }
    }
    if(this.launched)this.position.copy(this.origin).addScaledVector(this.direction,Math.min(this.age-RIFT_CAST.release,this.arrival-RIFT_CAST.release)*RIFT_CAST.speed);
    const t=this.launched?this.age-this.arrival:-1;this.phase=riftPhase(this.age,this.arrival,this.c);this.incision.visible=t<0;
    this.incision.position.copy(this.position);this.incision.quaternion.copy(this.heading);this.incision.rotation.z+=-.55;
    this.incision.scale.set(.45,Math.min(1,this.age/.22)*3.2,.6);
    this.fracture.visible=t>=0&&t<3.8;const opening=riftEase(t/.65),collapse=riftEase((t-3.05)/.75),open=Math.max(.001,opening*(1-collapse));
    this.fracture.scale.y=.15+.85*riftEase(t/.42);this.fracture.scale.z=1;
    const eu=this.edge.uniforms;eu.uOpen.value=t<0?1:open;eu.uRiftTime.value=this.age;eu.uEnergy.value=this.c.edgeGlow*(.6+collapse*.8);eu.uDetail.value=this.q.detail;eu.uAlpha.value=1;
    this.energy.uniforms.uOpen.value=t<0?1:open;this.energy.uniforms.uTime.value=this.age;this.energy.uniforms.uGlow.value=this.c.edgeGlow*(.8+collapse);this.energy.uniforms.uAlpha.value=1;
    const vu=this.voidMaterial.uniforms;vu.uTime.value=this.age;vu.uOpen.value=open;vu.uCollapse.value=collapse;vu.uDetail.value=this.q.detail;
    for(let i=0;i<this.branches.length;i++){const m=this.branches[i];m.visible=i<this.q.branches&&t>.35&&t<3.7;const side=i%2?1:-1;
      m.position.fromArray(this.branchPositions,i*3);m.position.x*=open;m.position.z-=.1;m.rotation.z=side*(.65+(i%3)*.25);m.scale.set(.24,1.6+(i%3)*.6,.3);
    }
    // Shards and motes remain visible when the solid tear has closed.
    this.shards.root.position.copy(t<0?this.position:this.target);this.shards.root.scale.setScalar(t<0?.1:1);this.shards.root.quaternion.copy(this.heading);this.particles.mesh.position.copy(t<0?this.position:this.target);this.particles.mesh.quaternion.copy(this.heading);
    this.shards.update(t<0?this.age*.4:t,this.q,this.c);this.particles.update(t<0?this.age*.5:t,this.q,t<0?1:this.c.height,t<0?.6:this.c.width);this.particles.mesh.visible=true;
    this.slashes.update(t,this.fracture,this.ctx,this.impact,this.c,this,this.q);
    if(t>=3.8&&!this.collapsed){this.collapsed=true;this.impact.collapse(this.ctx,this.target,this.c,this);this.ctx.cameraFeedback?.(.02,.16);}
    this.impact.update(t-3.8,this.target,this.ctx,this.c);
    this.flashMaterial.uniforms.uTime.value=this.age;this.flashMaterial.uniforms.uGlow.value=3*this.c.impactIntensity;
    this.flash.visible=t>=3.8&&t<3.96;this.flash.position.copy(this.target);this.flash.position.y+=this.c.height*.45;this.flash.quaternion.copy(this.heading);this.flash.scale.setScalar(Math.max(.001,1-(t-3.8)/.16));
    this.light.position.copy(t<0?this.position:this.target);this.light.position.y+=t<0?.2:4;
    this.light.intensity=t<0?.8:(t<3.8?2.5*opening:8*Math.exp(-(t-3.8)*9))*this.c.impactIntensity;
    if(t>=0&&t<3.8)this.ctx.skyFraming?.(.14*opening*(1-collapse),.12,8*opening*(1-collapse));
    this.root.userData.phase=this.phase;this.root.userData.slashHits=Number(this.slashes.hit[0])+Number(this.slashes.hit[1])+Number(this.slashes.hit[2]);this.root.userData.openProgress=open;return t<3.8+this.c.aftermath;
  }
  get particleCount():number{return this.active?this.q.particles:0;}
  get instanceCount():number{return this.active?this.shards.count:0;}
  dispose():void{if(!this.active)return;this.active=false;this.phase='complete';this.unsubscribe?.();this.unsubscribe=undefined;this.ctx.water?.removeOwner(this);this.root.removeFromParent();this.light.intensity=0;}
  destroy():void{if(this.destroyed)return;this.destroyed=true;this.dispose();this.edge.material.dispose();this.energy.dispose();this.flashMaterial.dispose();this.voidMaterial.dispose();this.shards.dispose();this.particles.dispose();this.slashes.dispose();this.impact.dispose();this.light.dispose();this.root.clear();}
}

