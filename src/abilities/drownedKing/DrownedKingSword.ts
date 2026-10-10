import { DynamicDrawUsage, Group, InstancedMesh, Mesh, Object3D, Quaternion, Vector3 } from 'three';
import { armorPlate, createKingFragment, createRunebladeGeometry } from './DrownedKingGeometry';
import { createKingMaterial } from './DrownedKingMaterial';
import { seed,smooth,saturate,type KingConfig,type KingQuality } from './DrownedKingConfig';

export class DrownedKingSword {
  readonly root=new Group();readonly weapon=new Group();readonly material=createKingMaterial(true);readonly fragmentsMaterial=createKingMaterial();
  readonly tip=new Vector3();readonly grip=new Vector3();readonly orientation=new Quaternion();readonly axis=new Vector3(0,1,0);
  readonly blade:Mesh;private readonly meshes:Mesh[]=[];private readonly fragments:InstancedMesh[]=[];private readonly dummy=new Object3D();
  private readonly direction=new Vector3();private readonly hiltPoint=new Vector3();private readonly targetPoint=new Vector3();
  constructor(){
    this.root.name='Thronebreaker · attached forged runeblade';this.root.add(this.weapon);
    this.blade=new Mesh(createRunebladeGeometry(),this.material.material);this.weapon.add(this.blade);this.meshes.push(this.blade);
    const guard=new Mesh(armorPlate([[-12,-1],[-10,1],[-5,2],[0,1],[5,2],[10,1],[12,-1],[9,-2],[0,-.5],[-9,-2]],1),this.fragmentsMaterial.material);guard.position.y=5;this.weapon.add(guard);this.meshes.push(guard);
    const pommel=new Mesh(armorPlate([[-1,-1],[-1.5,0],[0,1.5],[1.5,0],[1,-1]],.8),this.fragmentsMaterial.material);pommel.position.y=-4;this.weapon.add(pommel);this.meshes.push(pommel);
    for(let i=0;i<4;i++){const mesh=new InstancedMesh(createKingFragment(i),this.fragmentsMaterial.material,75);mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(DynamicDrawUsage);this.fragments.push(mesh);this.root.add(mesh);}
  }
  pose(t:number,c:Readonly<KingConfig>,surfaceDelta=0):void{
    const wind=smooth((t-6)/1.6),strike=saturate((t-8)/1),swing=strike*strike*(3-2*strike),recoil=t>9?Math.sin(Math.min(1,(t-9)/.5)*Math.PI)*.1:0;
    this.grip.set(8-wind*2,58+wind*6,20-wind*4);this.direction.set(.6-wind*1.45,.2+wind*.02,.7-wind*.3).normalize();
    const bladeLength=60*c.swordLength/65/(c.kingHeight/85),reach=Math.sqrt(Math.max(1,bladeLength*bladeLength-24*24));
    if(t>=8){this.grip.lerp(this.hiltPoint.set(0,52+surfaceDelta,35),swing);this.direction.lerp(this.targetPoint.set(0,-24,reach).normalize(),swing).normalize();}
    this.grip.y+=recoil*3;this.orientation.setFromUnitVectors(this.axis,this.direction);this.weapon.position.copy(this.grip);this.weapon.quaternion.copy(this.orientation);
    this.weapon.scale.set(c.swordThickness,c.swordLength/65/(c.kingHeight/85),c.swordThickness);
    this.tip.set(0,bladeLength,0).applyQuaternion(this.orientation).add(this.grip);
  }
  handTarget(side:number,result:Vector3):Vector3{return result.set(0,side?-1.7:1.7,0).applyQuaternion(this.orientation).add(this.grip);}
  update(t:number,c:Readonly<KingConfig>,q:KingQuality):void{
    const assemble=smooth((t-4)/2),charge=smooth((t-6)/2),after=Math.max(0,t-9),fade=1-smooth((t-11.5)/3);
    this.material.sync(c,t,charge,q.tier,fade);this.material.uniforms.uRough.value=Math.min(.8,c.armorRoughness+.16);this.fragmentsMaterial.sync(c,t,charge,q.tier,fade);this.material.uniforms.uReveal.value=assemble*(1-smooth((t-9.4)/.9));
    this.root.visible=t>=4&&t<14.5;this.weapon.visible=assemble>0&&t<10.4;this.fragments.forEach(m=>m.count=0);
    for(let i=0;i<q.fragments;i++){
      const mesh=this.fragments[i%4],h=seed(i+7),fraction=i/q.fragments,a=i*2.39996+t*.6;
      this.dummy.position.set(Math.cos(a)*(1-assemble)*18,Math.max(0,assemble)*fraction*60,Math.sin(a)*(1-assemble)*18);
      this.dummy.position.applyQuaternion(this.orientation).add(this.grip);
      if(t>9){const drag=(1-Math.exp(-after*.6))/.6;this.dummy.position.set(Math.cos(a)*drag*(8+h*25),28+(8+h*24)*after-7*after*after,90+Math.sin(a)*drag*(7+h*22));}
      this.dummy.rotation.set(i+t*.3,i*.3+t,i*.2);this.dummy.scale.setScalar((.6+h*1.3)*(1-smooth((assemble-fraction)*8)));
      if(t>9)this.dummy.scale.setScalar((.5+h*2)*fade);
      this.dummy.updateMatrix();mesh.setMatrixAt(mesh.count++,this.dummy.matrix);
    }this.fragments.forEach(m=>m.instanceMatrix.needsUpdate=true);
  }
  get instanceCount():number{return this.root.visible?this.fragments.reduce((n,m)=>n+m.count,0):0;}
  dispose():void{this.meshes.forEach(m=>m.geometry.dispose());this.fragments.forEach(m=>{m.geometry.dispose();m.dispose();});this.material.material.dispose();this.fragmentsMaterial.material.dispose();this.root.clear();}
}
