import { AdditiveBlending, DoubleSide, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Object3D, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { VisualOwner } from '../elemental/ElementalVisuals';
import { AstralParticles } from '../elemental/AstralVisuals';
import { ease, hash } from '../elemental/ElementalVisuals';
import { combustionMaterial } from './FireStream';
import type { FirePacket } from './FireStream';
import type { FireBudget } from './DragonfireConfig';
interface SteamPuff{birth:number;seed:number;position:Vector3;}
export class FireImpact {
  readonly tongues:InstancedMesh;readonly steam:AstralParticles;
  readonly centre=new Vector3();firstHit=Infinity;lastHit=-100;
  private readonly flash:InstancedMesh;private readonly flashMaterial;
  private readonly material;private readonly attributes:InstancedBufferAttribute;
  private readonly puffs:SteamPuff[];private cursor=0;private sequence=0;
  private readonly transform=new Object3D();
  constructor(owner:VisualOwner,private readonly budget:FireBudget){
    const g=owner.geometry(new PlaneGeometry(1,1,2,8)),count=budget.layers*3;
    this.attributes=new InstancedBufferAttribute(new Float32Array(count*4),4).setUsage(DynamicDrawUsage);g.setAttribute('aFire',this.attributes);this.material=owner.material(combustionMaterial());
    this.tongues=new InstancedMesh(g,this.material,count);this.tongues.frustumCulled=false;owner.root.add(this.tongues);
    this.steam=new AstralParticles(owner,budget.steam,'#afbec7','solar',true);
    this.puffs=Array.from({length:budget.steam},()=>({birth:-100,seed:0,position:new Vector3()}));
    this.flashMaterial=owner.material(new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending,
      uniforms:{uFade:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec2 vUv;uniform float uFade;void main(){vec2 p=vUv*2.-1.;float a=pow(max(0.,1.-abs(p.x)-abs(p.y)),3.);gl_FragColor=vec4(vec3(1.25,.8,.3),a*uFade);}' }));
    this.flash=new InstancedMesh(owner.geometry(new PlaneGeometry(1,1)),this.flashMaterial,1);this.flash.frustumCulled=false;owner.root.add(this.flash);
  }
  hit(p:FirePacket,t:number):void {
    this.firstHit=Math.min(this.firstHit,t);this.lastHit=t;this.centre.copy(p.end);
    const count=this.budget.steam===24?2:this.budget.steam===48?3:4;
    for(let i=0;i<count;i++){const s=this.puffs[this.cursor++%this.puffs.length];s.birth=t;s.seed=hash(this.sequence++ +96);s.position.copy(p.end);}
  }
  update(t:number,context:AbilityCastContext):void {
    const d=this.transform,age=t-this.lastHit,after=t-this.firstHit,fade=(1-ease((age-.1)/.7))*(1-ease((t-3.4)/.7));
    this.material.uniforms.uTime.value=t;this.tongues.count=0;
    if(Number.isFinite(after)&&after>=0&&fade>.002){
      const count=this.budget.layers*3;
      for(let i=0;i<count;i++){const a=i/count*Math.PI*2,seed=hash(i+42),r=.35+Math.min(.4,age)*(3+seed*2);
        d.position.copy(this.centre);d.position.x+=Math.cos(a)*r;d.position.z+=Math.sin(a)*r;d.position.y+=.2+seed*.35;
        d.rotation.set(-Math.PI*.36,0,-a);d.scale.set(.7+seed*.45,1.1+seed*.9+Math.min(.6,age)*1.7,1);d.updateMatrix();this.tongues.setMatrixAt(i,d.matrix);this.attributes.setXYZW(i,fade*.65,seed,seed*.55,age);}
      this.tongues.count=count;
    }
    this.tongues.instanceMatrix.needsUpdate=true;this.attributes.needsUpdate=true;
    d.position.copy(this.centre).setY(.13);d.rotation.set(-Math.PI/2,0,0);d.scale.setScalar(1.8+Math.min(.3,Math.max(0,age))*4);d.updateMatrix();this.flash.setMatrixAt(0,d.matrix);this.flash.instanceMatrix.needsUpdate=true;this.flashMaterial.uniforms.uFade.value=after>=0?(1-ease(age/.16))*.65:0;
    let n=0;this.steam.material.uniforms.uFade.value=.24;
    for(const p of this.puffs){const a=t-p.birth;if(a<0||a>1.5)continue;const theta=p.seed*6.283,life=ease(a/.12)*(1-ease((a-.8)/.7))*(1-ease((t-4.1)/.4));
      d.position.copy(p.position);d.position.x+=Math.cos(theta)*a*.65;d.position.z+=Math.sin(theta)*a*.65;d.position.y+=.2+a*(1.4+p.seed*.7);d.quaternion.copy(context.camera.quaternion);d.scale.setScalar((.35+a*.85)*life);d.updateMatrix();this.steam.mesh.setMatrixAt(n++,d.matrix);
    }this.steam.mesh.count=n;this.steam.mesh.instanceMatrix.needsUpdate=true;
  }
}
