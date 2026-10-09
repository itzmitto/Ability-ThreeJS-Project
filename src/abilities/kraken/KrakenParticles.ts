import { InstancedBufferAttribute, Object3D } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { VisualOwner } from '../elemental/ElementalVisuals';
import { AstralParticles } from '../elemental/AstralVisuals';
import { ease, hash } from '../elemental/ElementalVisuals';
import type { KrakenBudget } from './KrakenConfig';
interface Droplet { birth:number; x:number; z:number; vx:number; vy:number; vz:number; size:number; life:number; }
/** Bounded cast-local spray pool; donor particles/RateEmitter replaced by existing VFX batches. */
export class KrakenParticles {
  readonly snow:AstralParticles;
  readonly spray:AstralParticles;
  readonly ink:AstralParticles;
  private readonly drops:Droplet[]=Array.from({length:550},()=>({birth:-100,x:0,z:0,vx:0,vy:0,vz:0,size:0,life:0}));
  private readonly inkDrops:Droplet[]=Array.from({length:50},()=>({birth:-100,x:0,z:0,vx:0,vy:0,vz:0,size:0,life:0}));
  private inkCursor=0;
  private cursor=0;
  private sequence=0;
  private readonly transform=new Object3D();
  private readonly sprayAlpha:InstancedBufferAttribute;
  constructor(owner:VisualOwner){
    this.snow=new AstralParticles(owner,300,'#78baae','solar');
    this.spray=new AstralParticles(owner,550,'#a2b9cd','solar',true);
    this.ink=new AstralParticles(owner,100,'#0c172a','solar',true);
    this.sprayAlpha=new InstancedBufferAttribute(new Float32Array(550),1);
    this.spray.mesh.geometry.setAttribute('aDrop',this.sprayAlpha);
    this.spray.material.vertexShader=this.spray.material.vertexShader.replace('varying vec2 vUv;','attribute float aDrop;varying float vDrop;varying vec2 vUv;').replace('vUv=uv;','vUv=uv;vDrop=aDrop;');
    this.spray.material.fragmentShader=this.spray.material.fragmentShader.replace('varying vec2 vUv;','varying float vDrop;varying vec2 vUv;').replace('a*uFade','a*uFade*vDrop');
  }
  emit(t:number,x:number,z:number,power:number,q:KrakenBudget,finale=false):void {
    for(let i=0;i<Math.round((finale?18:3)*power);i++){
      const n=this.sequence++,a=hash(n+31)*Math.PI*2,r=this.inkDrops[this.inkCursor++%Math.max(1,Math.floor(q.ink/2))];
      r.birth=t;r.x=x;r.z=z;r.vx=Math.cos(a)*(.6+hash(n+72));r.vz=Math.sin(a)*(.6+hash(n+72));r.vy=.1;r.size=(.8+hash(n+44))*(finale?1.3:1);r.life=2.5;
    }
    const amount=Math.min(q.spray,Math.round((finale?140:22)*power*(q.spray/260)));
    for(let i=0;i<amount;i++){
      const n=this.sequence++,a=hash(n+21)*Math.PI*2,s=hash(n+119),r=this.drops[this.cursor++%q.spray];
      r.birth=t;r.x=x;r.z=z;r.vx=Math.cos(a)*(3+s*6)*power;r.vz=Math.sin(a)*(3+s*6)*power;
      r.vy=(3+hash(n+8)*6)*(finale?1.35:1)*Math.sqrt(power);r.size=.045+s*.13;r.life=1.1+hash(n+35)*.7;
    }
  }
  update(t:number,q:KrakenBudget,context:AbilityCastContext):void {
    const fade=ease((t-.5)/.8)*(1-ease((t-9.6)/1.4)),d=this.transform;
    this.snow.mesh.count=q.snow;this.snow.material.uniforms.uFade.value=.6*fade;
    for(let i=0;i<q.snow;i++){
      const seed=hash(i+97),a=i*2.39996+t*.075,r=(2+seed*8)*(1+Math.sin(t*.23+i)*.04);
      d.position.set(Math.cos(a)*r,.3+hash(i+67)*5+Math.sin(t*.32+i)*.22,Math.sin(a)*r);d.quaternion.copy(context.camera.quaternion);d.scale.setScalar((.025+seed*.055)*fade);d.updateMatrix();this.snow.mesh.setMatrixAt(i,d.matrix);
    }this.snow.mesh.instanceMatrix.needsUpdate=true;
    this.ink.mesh.count=q.ink;this.ink.material.uniforms.uFade.value=.23*fade;
    for(let i=0;i<q.ink;i++){
      const seed=hash(i+134),age=(t*.22+seed*3)%3,a=i*2.39996+t*.08,r=8.5+age*.8;
      let size=(1.2+age*.65)*fade;
      if(i<Math.floor(q.ink/2)){
        const p=this.inkDrops[i],life=t-p.birth,live=life>=0&&life<p.life;
        const drag=(1-Math.exp(-life*1.9))/1.9;
        d.position.set(p.x+p.vx*drag,.15+Math.max(0,life)*p.vy,p.z+p.vz*drag);
        size=live?p.size*(1+life*.4)*ease(life/.15)*(1-ease((life-1.5)/1))*fade:0;
      }else d.position.set(Math.cos(a)*r,.12+hash(i+1)*.8+age*.25,Math.sin(a)*r);
      d.quaternion.copy(context.camera.quaternion);d.scale.set(size,size*.55,size);d.updateMatrix();this.ink.mesh.setMatrixAt(i,d.matrix);
    }this.ink.mesh.instanceMatrix.needsUpdate=true;
    this.spray.mesh.count=q.spray;this.spray.material.uniforms.uFade.value=.8;
    for(let i=0;i<q.spray;i++){
      const p=this.drops[i],age=t-p.birth,alive=age>=0&&age<p.life;
      if(alive){const drag=(1-Math.exp(-age*.7))/.7;d.position.set(p.x+p.vx*drag,.1+p.vy*age-4.9*age*age,p.z+p.vz*drag);}else d.position.set(0,-100,0);
      d.quaternion.copy(context.camera.quaternion);const alpha=alive&&d.position.y>0?(1-ease((age-p.life*.5)/(p.life*.5))):0;d.scale.set(p.size,p.size*(1.7+age),p.size);d.updateMatrix();this.spray.mesh.setMatrixAt(i,d.matrix);this.sprayAlpha.setX(i,alpha);
    }this.spray.mesh.instanceMatrix.needsUpdate=true;this.sprayAlpha.needsUpdate=true;
  }
}
