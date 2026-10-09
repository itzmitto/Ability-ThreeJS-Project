import { BufferGeometry, Float32BufferAttribute, InstancedMesh, Object3D } from 'three';
import type { AbilityCastContext } from '../Ability';
import { VisualOwner,SurfacePulse } from '../elemental/ElementalVisuals';
import { PackParticles,packMaterial,shardGeometry,ease,hash } from '../elemental/PackVisuals';
/** Folded almond-shaped leaf with a raised central vein, rather than particle discs. */
export function leafGeometry():BufferGeometry{
  const p:number[]=[],uv:number[]=[],idx:number[]=[];const rows=12;
  for(let i=0;i<=rows;i++){const t=i/rows,width=Math.sin(t*Math.PI)*.45;for(let j=0;j<3;j++){const x=(j-1)*width;p.push(x,t*1.5-.75,(j===1?.08:0)*Math.sin(t*Math.PI)+x*x*.16);uv.push(t,j/2);}}
  for(let i=0;i<rows;i++)for(let j=0;j<2;j++){const a=i*3+j;idx.push(a,a+1,a+3,a+1,a+4,a+3);}const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(p,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
export class WorldrootImpact {
  readonly leaves:InstancedMesh;
  readonly bark:InstancedMesh;
  readonly spores:PackParticles;
  readonly splash:PackParticles;
  readonly pulse:SurfacePulse;
  private readonly leafMaterial;
  private readonly barkMaterial;
  private readonly dummy=new Object3D();
  constructor(owner:VisualOwner){
    this.leafMaterial=owner.material(packMaterial('#78a255'));this.barkMaterial=owner.material(packMaterial('#665035'));
    this.leaves=new InstancedMesh(owner.geometry(leafGeometry()),this.leafMaterial,90);this.leaves.frustumCulled=false;owner.root.add(this.leaves);
    this.bark=new InstancedMesh(owner.geometry(shardGeometry()),this.barkMaterial,70);this.bark.frustumCulled=false;owner.root.add(this.bark);this.spores=new PackParticles(owner,150,'#afdb7e','spore');this.splash=new PackParticles(owner,60,'#a2c8c5','spore');this.pulse=new SurfacePulse(owner,true);
  }
  update(t:number,leaves:number,spores:number,bark:number,fade:number,context:AbilityCastContext):void{
    const age=t-4.65,d=this.dummy;this.leaves.count=leaves;this.leaves.visible=t>=1;this.leafMaterial.uniforms.uTime.value=t;this.leafMaterial.uniforms.uFade.value=fade;this.leafMaterial.uniforms.uEnergy.value=.15;this.barkMaterial.uniforms.uTime.value=t;this.barkMaterial.uniforms.uFade.value=fade;
    for(let i=0;i<leaves;i++){const s=hash(i+12),a=i*2.39996+t*.12;if(age<0){const r=4+s*3;d.position.set(Math.cos(a)*r,(2+s*6)*ease((t-1)/2),Math.sin(a)*r);}else{const r=3+(2+s*4)*age*.6;d.position.set(Math.cos(a)*r+Math.sin(t+i)*.5,Math.max(.1,3+s*6-age*(1+s)),Math.sin(a)*r+Math.cos(t+i)*.5);}d.rotation.set(i+t*.8,Math.sin(t+i),i+t*.5);const size=(.1+s*.22)*fade*ease((t-1)/.5);d.scale.set(size,size,size);d.updateMatrix();this.leaves.setMatrixAt(i,d.matrix);}this.leaves.instanceMatrix.needsUpdate=true;
    this.bark.count=bark;this.bark.visible=age>=0;
    for(let i=0;i<bark;i++){const s=hash(i+63),a=i*2.39996,r=Math.max(0,age)*(4+s*10);d.position.set(Math.cos(a)*r,Math.max(.04,1+(5+s*8)*Math.max(0,age)-5*Math.max(0,age)**2)-ease((t-7)/1),Math.sin(a)*r);d.rotation.set(t*3+i,i+t,t*2);const size=(.09+s*.22)*fade;d.scale.set(size*.35,size*1.5,size*.3);d.updateMatrix();this.bark.setMatrixAt(i,d.matrix);}this.bark.instanceMatrix.needsUpdate=true;
    this.spores.update(t,spores,4.65,fade*ease((t-.3)/.5),context);this.splash.update(t,Math.min(60,bark),4.65,fade*(age<0?.24:.6),context);this.pulse.update(Math.max(0,age),age<0?ease((t-.8)/1.2)*.24:(1-ease(age/3.35))*fade,age<0?8:4+age*12);
  }
}
