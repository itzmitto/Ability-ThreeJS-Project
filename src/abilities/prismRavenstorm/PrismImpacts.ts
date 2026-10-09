import { AdditiveBlending, DoubleSide, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, ShaderMaterial } from 'three';
import type { Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { VisualOwner } from '../elemental/ElementalVisuals';
import { ease, hash } from '../elemental/ElementalVisuals';
import { AstralParticles, brokenRingGeometry } from '../elemental/AstralVisuals';
import { prismBoltGeometry } from './PrismCrystalGeometry';
import { prismBoltMaterial, rainbowGLSL } from './PrismCrystalMaterials';
import type { PrismShot } from './PrismProjectileSystem';
import type { RavenstormBudget } from './PrismRavenstormConfig';
import { PRISM_RAVENSTORM } from './PrismRavenstormConfig';
interface Impact { time:number;x:number;z:number;scale:number;hue:number;seed:number; }
export class PrismImpacts {
  readonly flashes:InstancedMesh;readonly shards:InstancedMesh;readonly dust:AstralParticles;
  private readonly entries:Impact[];
  private cursor=0;private lastWater=-10;
  private readonly transform=new Object3D();
  private readonly flashAttributes:InstancedBufferAttribute;
  private readonly shardAttributes:InstancedBufferAttribute;
  private readonly shardMaterial;
  private readonly shell:Mesh;
  private readonly waveMaterial;
  private readonly arc:Mesh;
  private readonly arcMaterial:MeshBasicMaterial;
  constructor(owner:VisualOwner,private readonly budget:RavenstormBudget){
    this.entries=Array.from({length:budget.impacts},()=>({time:-100,x:0,z:0,scale:0,hue:0,seed:0}));
    const g=owner.geometry(new PlaneGeometry(1,1));this.flashAttributes=new InstancedBufferAttribute(new Float32Array(budget.impacts*4),4).setUsage(DynamicDrawUsage);g.setAttribute('aBolt',this.flashAttributes);
    const m=owner.material(new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending,
      vertexShader:'attribute vec4 aBolt;varying vec2 vUv;varying vec4 vBolt;void main(){vUv=uv;vBolt=aBolt;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vUv;varying vec4 vBolt;${rainbowGLSL}void main(){if(vBolt.x<.003)discard;vec2 p=vUv*2.-1.;float r=abs(p.x)+abs(p.y);float core=pow(max(0.,1.-r),5.);float rays=pow(max(0.,1.-min(abs(p.x),abs(p.y))*18.),3.)*pow(max(0.,1.-r),2.);float a=(core+rays*.22)*vBolt.x;gl_FragColor=vec4(mix(rainbow(vBolt.z),vec3(.95,1.,1.),core),a);}` }));
    this.flashes=new InstancedMesh(g,m,budget.impacts);this.flashes.instanceMatrix.setUsage(DynamicDrawUsage);this.flashes.frustumCulled=false;owner.root.add(this.flashes);
    const sg=owner.geometry(prismBoltGeometry(3,budget.impacts*4));this.shardAttributes=sg.getAttribute('aBolt') as InstancedBufferAttribute;this.shardMaterial=owner.material(prismBoltMaterial());
    this.shards=new InstancedMesh(sg,this.shardMaterial,budget.impacts*4);this.shards.instanceMatrix.setUsage(DynamicDrawUsage);this.shards.frustumCulled=false;owner.root.add(this.shards);
    this.dust=new AstralParticles(owner,budget.dust,'#d8e7ed','solar');
    // A broken polygonal resonance band replaces the round translucent sphere shell.
    this.waveMaterial=owner.material(new MeshBasicMaterial({color:'#b8dcfa',transparent:true,opacity:0,depthWrite:false,blending:AdditiveBlending}));
    this.shell=new Mesh(owner.geometry(brokenRingGeometry(1,24,.017)),this.waveMaterial);this.shell.rotation.x=-Math.PI/2;owner.root.add(this.shell);
    this.arcMaterial=owner.material(new MeshBasicMaterial({color:'#e4f9ff',transparent:true,opacity:0,depthWrite:false,blending:AdditiveBlending}));this.arc=new Mesh(owner.geometry(brokenRingGeometry(1,48,.025)),this.arcMaterial);this.arc.rotation.x=-Math.PI/2;owner.root.add(this.arc);
  }
  hit(shot:PrismShot,context:AbilityCastContext,target:Vector3,waterOwner:object):void {
    const time=shot.birth+shot.duration,e=this.entries[this.cursor++%this.entries.length];e.time=time;e.x=shot.end.x;e.z=shot.end.z;e.scale=shot.final?1.5:shot.scale;e.hue=shot.hue;e.seed=shot.seed;
    // Batch nearby high-frequency impacts into bounded ocean disturbances; every shot keeps its own VFX.
    if(time-this.lastWater>=(shot.final?.045:.09)){
      this.lastWater=time;this.transform.position.copy(target).add(shot.end);
      context.water?.addRipple({position:this.transform.position,strength:shot.final?.2:.045+shot.scale*.07,duration:.75,waveSpeed:5,wavelength:.45,radius:.22},waterOwner);
    }
  }
  update(t:number,context:AbilityCastContext):void {
    const d=this.transform;let flashes=0,shards=0;this.shardMaterial.uniforms.uTime.value=t;
    for(const hit of this.entries){const age=t-hit.time;if(age<0||age>1.05)continue;
      if(age<.26){const n=flashes++,size=(.18+age*1.1)*(.5+hit.scale);d.position.set(hit.x,.12,hit.z);d.rotation.set(-Math.PI/2,0,hit.seed*6);d.scale.set(size,size,1);d.updateMatrix();this.flashes.setMatrixAt(n,d.matrix);this.flashAttributes.setXYZW(n,1-ease(age/.26),1,hit.hue,hit.seed);}
      for(let i=0;i<4;i++){const n=shards++,a=hit.seed*6.283+i*Math.PI*.5,r=age*(1.4+hit.scale*2.3);d.position.set(hit.x+Math.cos(a)*r,.13+(1.8+hit.seed*1.5)*age-3.8*age*age,hit.z+Math.sin(a)*r);d.rotation.set(age*5+i,hit.seed*7,age*8+i);d.scale.setScalar((.045+hit.scale*.055)*(1-ease(age/1.05)));d.updateMatrix();this.shards.setMatrixAt(n,d.matrix);this.shardAttributes.setXYZW(n,d.position.y>.04?1-ease(age/1.05):0,.7,(hit.hue+i*.018)%1,hit.seed);}
    }
    this.flashes.count=flashes;this.shards.count=shards;this.flashes.instanceMatrix.needsUpdate=this.shards.instanceMatrix.needsUpdate=true;this.flashAttributes.needsUpdate=this.shardAttributes.needsUpdate=true;
    const after=t-PRISM_RAVENSTORM.pulse,fade=1-ease(after/.95);this.shell.visible=this.arc.visible=after>=0&&after<.95;
    const radius=.5+Math.max(0,after)*15;this.shell.position.y=.3;this.shell.scale.setScalar(radius);this.waveMaterial.opacity=after>=0?fade*.24:0;this.waveMaterial.color.setHSL((t*.055+.55)%1,.32,.74);
    this.arc.position.y=.1;this.arc.scale.setScalar(radius*.9);this.arcMaterial.opacity=after>=0?fade*.48:0;this.arc.rotation.z=t*.12;
    const dustFade=ease((t-6.75)/.3)*(1-ease((t-7.4)/.6));this.dust.mesh.count=this.budget.dust;this.dust.material.uniforms.uFade.value=dustFade*.65;
    for(let i=0;i<this.budget.dust;i++){const seed=hash(i+26),a=i*2.39996+after*.2,r=(1+seed*5)+Math.max(0,after)*(1+seed*2);d.position.set(Math.cos(a)*r,.2+hash(i+89)*3-Math.max(0,after)*.4,Math.sin(a)*r);d.quaternion.copy(context.camera.quaternion);d.scale.setScalar((.025+seed*.055)*dustFade);d.updateMatrix();this.dust.mesh.setMatrixAt(i,d.matrix);}this.dust.mesh.instanceMatrix.needsUpdate=true;
  }
}
