import { InstancedMesh, Mesh, Object3D, SphereGeometry } from 'three';
import type { AbilityCastContext } from '../Ability';
import { VisualOwner, SurfacePulse } from '../elemental/ElementalVisuals';
import { PackParticles, packMaterial, shardGeometry, ease, hash } from '../elemental/PackVisuals';
export class GlassTempestImpact {
  readonly shards:InstancedMesh;
  readonly sand:PackParticles;
  readonly dust:PackParticles;
  readonly sparkle:PackParticles;
  readonly pulse:SurfacePulse;
  readonly flash:Mesh;
  readonly material;
  private readonly dummy=new Object3D();
  constructor(owner:VisualOwner){
    this.material=owner.material(packMaterial('#d8d7b9',true));this.shards=new InstancedMesh(owner.geometry(shardGeometry()),this.material,280);this.shards.frustumCulled=false;owner.root.add(this.shards);
    this.sand=new PackParticles(owner,340,'#bca269','sand');this.dust=new PackParticles(owner,100,'#9c835a','sand',true);this.sparkle=new PackParticles(owner,160,'#edf5e9','sand');this.pulse=new SurfacePulse(owner,false);
    this.flash=new Mesh(owner.geometry(new SphereGeometry(1,28,16)),owner.material(packMaterial('#ffdb91',true)));owner.root.add(this.flash);
  }
  update(t:number,shards:number,sand:number,dust:number,fade:number,context:AbilityCastContext):void{
    const age=t-4.4,collapse=ease((t-3.4)/1);this.material.uniforms.uTime.value=t;this.material.uniforms.uFade.value=fade;this.material.uniforms.uEnergy.value=.3+collapse*.6;this.shards.count=shards;this.shards.visible=t>=1;
    const d=this.dummy;
    for(let i=0;i<shards;i++){const s=hash(i+9),a=i*2.39996+t*.45;
      if(age<0){const r=(2+s*3)*(1-collapse*.95);d.position.set(Math.cos(a)*r,(1+hash(i+47)*7)*(1-collapse*.75),Math.sin(a)*r);}
      else{const a0=i*2.39996+4.4*.45,speed=5+s*13,flight=Math.max(0,age-s*.14);d.position.set(Math.cos(a0)*speed*flight,Math.max(.05,2+(5+s*11)*flight-5*flight*flight)-ease((t-6.5)/.5),Math.sin(a0)*speed*flight);}
      d.rotation.set(i+t*(1+s),i*2+t*.7,t+i*.3);const scale=(.08+s*.24)*fade*(age<0?ease((t-1)/.7):1);d.scale.set(scale*.5,scale*1.4,scale*.7);d.updateMatrix();this.shards.setMatrixAt(i,d.matrix);
    }
    this.shards.instanceMatrix.needsUpdate=true;this.sand.update(t,sand,4.4,fade,context);this.dust.update(t,dust,4.4,fade,context);this.sparkle.update(t,Math.min(160,Math.round(shards*.5)),4.4,age>=0?fade*(1-ease(age/2.6)):.08,context);
    this.pulse.update(Math.max(0,age),age<0?ease((t-.3)/1)*.25:(1-ease(age/2.6))*fade,age<0?7:4+age*12);
    this.flash.visible=t>=3.7&&t<4.85;const size=age<0?.4+collapse*.8:1+age*13;this.flash.position.y=age<0?2.2:.8;this.flash.scale.set(size,size*(age<0?1:.35),size);(this.flash.material as typeof this.material).uniforms.uFade.value=age<0?collapse*.6:Math.max(0,1-age/.45)*.7;
  }
}
