import { BufferGeometry, DynamicDrawUsage, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three';
import { armorLibrary } from './DrownedKingGeometry';
import type { KingConfig } from './DrownedKingConfig';
import { seed, smooth } from './DrownedKingConfig';
import { createKingMaterial } from './DrownedKingMaterial';
type Part={node:Object3D,base:Vector3,rotation:Quaternion,batch:number,slot:number,id:number};
type Arm={shoulder:Object3D,elbow:Object3D,hand:Object3D,fingers:Object3D[]};
/** Visible armor is batched; the actual articulated transform hierarchy drives its instance matrices. */
export class DrownedKingRig {
  readonly root=new Group();readonly torso=new Object3D();readonly head=new Object3D();readonly crown=new Object3D();readonly material=createKingMaterial();
  readonly arms:Arm[]=[];readonly batches:InstancedMesh[]=[];readonly pieces:Part[]=[];readonly geometries:BufferGeometry[]=armorLibrary();
  readonly eyes:InstancedMesh;private readonly eyeMaterial=new MeshStandardMaterial({color:'#58e1cb',emissive:'#85ffe6',emissiveIntensity:1.1,roughness:.2,fog:false});
  private readonly helper=new Object3D();private readonly matrix=new Matrix4();private readonly inverse=new Matrix4();
  private readonly down=new Vector3(0,-1,0);private readonly direction=new Vector3();private readonly bend=new Vector3();private readonly elbowPoint=new Vector3();
  private readonly fingerAxis=new Vector3(1,0,0);
  private readonly rotation=new Quaternion();private readonly foreRotation=new Quaternion();private readonly target=new Vector3();
  constructor(){
    this.root.name='Drowned King · articulated instanced armor';this.root.add(this.torso);this.torso.add(this.head);this.head.add(this.crown);this.head.position.y=71.5;
    for(const g of this.geometries){const mesh=new InstancedMesh(g,this.material.material,160);mesh.count=0;mesh.instanceMatrix.setUsage(DynamicDrawUsage);mesh.frustumCulled=false;this.batches.push(mesh);this.root.add(mesh);}
    const add=(parent:Object3D,batch:number,p:readonly[number,number,number],s:readonly[number,number,number],r:readonly[number,number,number]=[0,0,0])=>this.add(parent,batch,p,s,r);
    add(this.torso,3,[0,51,5],[13,14,8]);add(this.torso,0,[0,53,10],[6,9,2]);
    for(let i=0;i<4;i++)add(this.torso,8,[0,39-i*3,6],[10-i*.8,3,3]);
    for(const side of [-1,1]){add(this.torso,0,[side*10,29,0],[6,9,5],[0,side*.35,side*.12]);add(this.torso,2,[side*7,15,0],[5,30,5]);}
    // Bascinet-like shell, separated brow/jaw plates leave a physical slit behind the luminous eyes.
    add(this.head,4,[0,1,0],[6,8,6]);add(this.head,8,[0,3,6],[6,2.3,1.2]);
    add(this.head,6,[-2.8,-.8,6],[3,5,1.6],[0,-.15,.06]);add(this.head,6,[2.8,-.8,6],[3,5,1.6],[0,.15,-.06]);
    add(this.head,7,[0,-.4,7.6],[1.1,5.2,1]);add(this.head,8,[0,-4.5,5],[4.8,2.5,2]);
    for(let i=0;i<9;i++){if(i===3||i===7)continue;const a=i/9*Math.PI*2;add(this.crown,7,[Math.cos(a)*5.3,8+seed(i)*1.2,Math.sin(a)*5.3],[1.9,2.8+seed(i+3)*3,1.4],[0,-a,Math.cos(a)*.2]);}
    for(let side=0;side<2;side++){
      const sign=side?1:-1,shoulder=new Object3D(),elbow=new Object3D(),hand=new Object3D();shoulder.position.set(sign*17,62,0);elbow.position.y=-21;hand.position.y=-21;
      this.torso.add(shoulder);shoulder.add(elbow);elbow.add(hand);const fingers:Object3D[]=[];
      for(let i=0;i<3;i++)add(shoulder,3,[sign*i*1.5,-i*2,0],[10-i,5,7],[0,0,sign*.15]);
      add(shoulder,1,[0,-10.5,0],[5,20,5]);add(elbow,0,[0,0,2],[5.8,5,4]);add(elbow,2,[0,-10.5,0],[4.6,20,4.5]);add(hand,0,[0,-1.8,0],[4.5,4,2.7]);
      for(let f=0;f<5;f++){let joint=new Object3D();joint.position.set(f===4?sign*4.1:(f-1.5)*1.8,f===4?-1.4:-4,0);hand.add(joint);
        for(let j=0;j<3;j++){fingers.push(joint);add(joint,1,[0,-1,0],[.85,2.2,.85]);const next=new Object3D();next.position.y=-2.1;joint.add(next);joint=next;}}
      this.arms.push({shoulder,elbow,hand,fingers});
    }
    this.eyes=new InstancedMesh(this.geometries[8],this.eyeMaterial,2);this.eyes.frustumCulled=false;this.root.add(this.eyes);
  }
  private add(parent:Object3D,batch:number,p:readonly[number,number,number],s:readonly[number,number,number],r:readonly[number,number,number]):Object3D{
    const node=new Object3D();node.position.set(...p);node.scale.set(...s);node.rotation.set(...r);parent.add(node);
    const mesh=this.batches[batch],slot=mesh.count++;this.pieces.push({node,base:node.position.clone(),rotation:node.quaternion.clone(),batch,slot,id:this.pieces.length});return node;
  }
  /** Analytic two-bone IK in torso coordinates, with stable outward elbows and quaternion joints. */
  reach(side:number,target:Vector3,grip:Quaternion,curl:number):void{
    const arm=this.arms[side],origin=arm.shoulder.position;this.direction.subVectors(target,origin);const distance=Math.max(.1,Math.min(41.9,this.direction.length()));this.direction.normalize();
    const along=distance*.5,height=Math.sqrt(Math.max(0,21*21-along*along));
    this.bend.set(side?1:-1,0,-.3).addScaledVector(this.direction,-this.bend.dot(this.direction)).normalize();
    this.elbowPoint.copy(origin).addScaledVector(this.direction,along).addScaledVector(this.bend,height);
    this.rotation.setFromUnitVectors(this.down,this.target.subVectors(this.elbowPoint,origin).normalize());arm.shoulder.quaternion.copy(this.rotation);
    this.foreRotation.setFromUnitVectors(this.down,this.target.subVectors(target,this.elbowPoint).normalize());
    arm.elbow.quaternion.copy(this.rotation).invert().multiply(this.foreRotation);arm.hand.quaternion.copy(this.foreRotation).invert().multiply(grip);
    arm.fingers.forEach((joint,i)=>joint.quaternion.setFromAxisAngle(this.fingerAxis,curl*(i%3===0?.8:1.1)));
  }
  update(t:number,c:Readonly<KingConfig>,tier:number,charge:number):void{
    const breakup=smooth((t-11.5)/2.5),fade=1-smooth((t-14.5)/2.5);this.material.sync(c,t,charge,tier,fade);this.crown.scale.setScalar(c.crownScale);
    for(const part of this.pieces){part.node.position.copy(part.base);part.node.quaternion.copy(part.rotation);const h=seed(part.id+11);
      if(breakup>0){part.node.position.x+=(h-.5)*breakup*12;part.node.position.y-=breakup*breakup*(4+h*12);part.node.position.z+=Math.sin(part.id)*breakup*8;part.node.quaternion.multiply(this.rotation.setFromAxisAngle(this.fingerAxis,breakup*(h-.5)*1.5));}}
    this.root.updateWorldMatrix(true,true);this.inverse.copy(this.root.matrixWorld).invert();
    for(const part of this.pieces){this.matrix.multiplyMatrices(this.inverse,part.node.matrixWorld);this.batches[part.batch].setMatrixAt(part.slot,this.matrix);}
    this.batches.forEach(m=>m.instanceMatrix.needsUpdate=true);
    for(let i=0;i<2;i++){this.helper.position.set(i?2.7:-2.7,1.1,6.9);this.helper.scale.set(2.4,.22,.15);this.helper.rotation.set(0,0,i?-.03:.03);this.helper.updateMatrix();this.matrix.copy(this.head.matrixWorld).multiply(this.helper.matrix).premultiply(this.inverse);this.eyes.setMatrixAt(i,this.matrix);}
    this.eyes.instanceMatrix.needsUpdate=true;this.eyeMaterial.emissiveIntensity=c.eyeGlow*(1-breakup);this.eyes.visible=t>3&&t<14;
  }
  get instanceCount():number{return this.pieces.length+(this.eyes.visible?2:0);}
  dispose():void{this.geometries.forEach(g=>g.dispose());this.material.material.dispose();this.eyeMaterial.dispose();this.batches.forEach(m=>m.dispose());this.eyes.dispose();this.root.clear();}
}
