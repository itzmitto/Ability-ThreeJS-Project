import {Group,IcosahedronGeometry,InstancedMesh,Mesh,Object3D} from 'three';
import type {VisualOwner} from '../elemental/ElementalVisuals';
import {shardGeometry} from '../elemental/PackVisuals';
import {brokenRingGeometry,ease,hash} from '../elemental/AstralVisuals';
import {cryoMaterial} from './CryoMaterials';
export class FrozenSphere{
  readonly root=new Group();
  readonly shells:Mesh[]=[];
  readonly rings:Mesh[]=[];
  readonly shards:InstancedMesh;
  readonly bodyMaterial;
  readonly shardMaterial;
  readonly ringMaterial;
  private readonly geometries:IcosahedronGeometry[];
  private readonly dummy=new Object3D();
  constructor(owner:VisualOwner){
    this.bodyMaterial=owner.material(cryoMaterial(0));this.shardMaterial=owner.material(cryoMaterial(1));this.ringMaterial=owner.material(cryoMaterial(2));
    this.geometries=[1,2,3].map(detail=>{const g=owner.geometry(new IcosahedronGeometry(1,detail)),p=g.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.065*Math.sin(x*13.+y*7.)*Math.cos(z*11.-y*5.);p.setXYZ(i,x*r,y*r,z*r);}g.computeVertexNormals();return g;});
    for(let i=0;i<3;i++){const m=new Mesh(this.geometries[1],i===0?this.bodyMaterial:this.shardMaterial);m.scale.setScalar(1+i*.065);this.shells.push(m);this.root.add(m);}
    const ring=owner.geometry(brokenRingGeometry(1.4,84,.022));for(let i=0;i<5;i++){const m=new Mesh(ring,this.ringMaterial);m.rotation.set(i*.64,.3+i*.7,i*.44);m.scale.setScalar(1+i*.07);this.rings.push(m);this.root.add(m);}owner.root.add(this.root);
    this.shards=new InstancedMesh(owner.geometry(shardGeometry()),this.shardMaterial,120);this.shards.frustumCulled=false;owner.root.add(this.shards);
  }
  update(t:number,rings:number,shards:number,detail:number,layers:number,fade:number):void{
    const growth=ease((t-1)/1.5),compression=ease((t-3.4)/.8),age=t-4.2;
    this.root.visible=t>=.3&&t<4.35;this.root.position.y=1.5+growth*8;this.root.rotation.y=t*.08;this.root.scale.setScalar(Math.max(.015,(.12+growth*4.3)*(1-compression*.99)));
    this.shells.forEach((m,i)=>{m.visible=i<layers;m.geometry=this.geometries[detail-1];m.rotation.set(i*.4+t*.035,i*.7-t*.05,i);});
    this.rings.forEach((m,i)=>{m.visible=i<rings&&t>=1.7;m.rotation.set(i*.64+t*.12,.3+i*.7+t*(.2+i*.04),i*.44+t*.07);});
    for(const mat of [this.bodyMaterial,this.shardMaterial,this.ringMaterial]){mat.uniforms.uTime.value=t;mat.uniforms.uEnergy.value=.3+compression*1.7;mat.uniforms.uFade.value=fade;mat.uniforms.uDetail.value=detail;}this.bodyMaterial.uniforms.uGrowth.value=.1+growth*.9;this.shardMaterial.uniforms.uGrowth.value=1;
    this.shards.count=shards;this.shards.visible=t>=.3;const d=this.dummy;
    for(let i=0;i<shards;i++){const s=hash(i+9),a=i*2.39996+Math.min(t,4.2)*(.25+s*.5+compression*2),r=(3+s*4)*(1-compression*.985);
      if(age<0){d.position.set(Math.cos(a)*r,(1.2+growth*8)+Math.sin(a*.7+i)*r*.4,Math.sin(a)*r);}else{const flight=Math.max(0,age-s*.1),radius=Math.min(24,(5+s*14)*flight);d.position.set(Math.cos(a)*radius,Math.max(.09,3+(5+s*9)*flight-5*flight*flight)-ease((t-7.2)/.8),Math.sin(a)*radius);}
      d.rotation.set(i+t*(.5+s),i*.3+t*.7,t+i);const size=(.13+s*.3)*fade*ease((t-.3)/.5);d.scale.set(size*(i%3===0?1.2:.5),size*(i%3===0?.6:1.8),size*.55);d.updateMatrix();this.shards.setMatrixAt(i,d.matrix);
    }this.shards.instanceMatrix.needsUpdate=true;
  }
}
