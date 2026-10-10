import { DynamicDrawUsage, Group, InstancedMesh, Object3D } from 'three';
import type { RiftResources } from './RiftGeometry';
import { riftBoundary } from './RiftGeometry';
import { riftSeed, riftEase, type RiftConfig, type RiftQuality } from './RiftreaverConfig';
import { createRiftEdgeMaterial } from './RiftMaterials';
export class RiftShards {
  readonly root=new Group();readonly rock;readonly meshes:InstancedMesh[];private readonly dummy=new Object3D();private readonly positions=new Float32Array(105*3);count=0;
  constructor(r:RiftResources,c:RiftConfig){for(let i=0;i<105;i++){const b=riftBoundary(.05+riftSeed(i+5)*.9,i%2?1:-1,c);this.positions.set(b,i*3);}
    this.rock=createRiftEdgeMaterial(c);this.meshes=r.shards.map(g=>{const m=new InstancedMesh(g,this.rock.material,35);m.instanceMatrix.setUsage(DynamicDrawUsage);m.frustumCulled=false;this.root.add(m);return m;});}
  update(t:number,q:RiftQuality,c:RiftConfig):void{
    this.root.visible=t>=0&&t<3.8+c.aftermath;if(!this.root.visible)return;
    this.meshes.forEach(m=>m.count=0);this.count=q.shards;
    const opening=riftEase(t/.65),pull=1-riftEase((t-3.05)/.75),burst=Math.max(0,t-3.8),fade=Math.max(.001,1-burst/c.aftermath);
    for(let i=0;i<this.count;i++){
      const seed=riftSeed(i+88),k=i*3,a=seed*6.283+t*(.22+seed*.4);
      this.dummy.position.set(this.positions[k]*opening+Math.cos(a)*c.shardOrbitRadius*opening,this.positions[k+1],this.positions[k+2]+Math.sin(a)*c.shardOrbitRadius*1.5);
      this.dummy.position.x*=pull;this.dummy.position.y=c.height*.45+(this.dummy.position.y-c.height*.45)*pull;this.dummy.position.z*=pull;
      if(burst>0){const expansion=(1-Math.exp(-burst*3))*(2+seed*11);this.dummy.position.set(Math.cos(a)*expansion,c.height*.45+riftSeed(i+20)*expansion*.7-burst*burst*8,Math.sin(a)*expansion);}
      this.dummy.rotation.set(a*1.5,t*(.7+seed)+i,a*.4);const size=(.28+seed*.85)*opening*fade;
      this.dummy.scale.set(size*.8,size*(1+riftSeed(i+4)*1.7),size);this.dummy.updateMatrix();const m=this.meshes[i%3];m.setMatrixAt(m.count++,this.dummy.matrix);
    }
    this.meshes.forEach(m=>m.instanceMatrix.needsUpdate=true);const u=this.rock.uniforms;u.uRiftTime.value=t;u.uEnergy.value=c.edgeGlow*.5;u.uDetail.value=q.detail;u.uAlpha.value=fade;
  }
  dispose():void{this.meshes.forEach(m=>m.dispose());this.rock.material.dispose();this.root.clear();}
}
