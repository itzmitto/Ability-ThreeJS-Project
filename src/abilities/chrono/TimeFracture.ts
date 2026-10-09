import {Group,InstancedMesh,Object3D} from 'three';
import type {InstancedBufferAttribute} from 'three';
import {VisualOwner,hash} from '../elemental/ElementalVisuals';
import {clockRingSegment,clockPlate,clockHandPiece} from './ClockRingGeometry';
import {clockMaterial} from './ClockMaterials';
import type {ChronoState} from './ChronoTimeline';
/** Reversible small clock components, then distinct fracture/convergence/ejection trajectories. */
export class TimeFracture{
  readonly meshes:InstancedMesh[]=[];
  private readonly material;
  private readonly dummy=new Object3D();
  private readonly attributes:InstancedBufferAttribute[]=[];
  private readonly counters=new Uint8Array(3);
  constructor(owner:VisualOwner,parent:Group){
    this.material=owner.material(clockMaterial(true));const geometries=[clockRingSegment(50,5),clockPlate(50),clockHandPiece(1,50)];
    for(const g of geometries){owner.geometry(g);this.attributes.push(g.getAttribute('aTemporal') as InstancedBufferAttribute);const m=new InstancedMesh(g,this.material,50);m.frustumCulled=false;this.meshes.push(m);parent.add(m);}
  }
  update(age:number,s:ChronoState,count:number):void{
    this.counters.fill(0);this.material.uniforms.uTime.value=s.time;this.material.uniforms.uBlue.value=s.blue;
    const d=this.dummy,after=age-5.8;
    for(let i=0;i<count;i++){const v=i%3,n=this.counters[v]++,seed=hash(i+47),angle=i*2.39996+s.time*(.15+seed*.3),r=(4+seed*3+s.fracture*2)*(1-s.collapse*s.collapse),out=after>=0?after*(3+seed*11):0;
      d.position.set(Math.cos(angle)*(r+out),Math.sin(angle)*(r+out)-(after>=0?after*after*2:0),Math.sin(angle*1.7)*(.8+s.fracture*2)*(1-s.collapse)+(after>=0?Math.sin(i)*after*3:0));d.rotation.set(s.time*.14+i,s.time*.17+i*.4,angle+s.fracture*seed);
      const build=Math.max(0,Math.min(1,(age-.7)/.7)),size=(.13+seed*.2)*build*(after>=0?1:1-s.collapse*.94);d.scale.set(size*(v===0?8:1),size*(v===0?8:v===2?1.2:1),size*(v===0?8:1));d.updateMatrix();this.meshes[v].setMatrixAt(n,d.matrix);this.attributes[v].setXYZW(n,build*s.fade*.7,seed,.6+s.fracture,0);
    }
    this.meshes.forEach((m,i)=>{m.count=this.counters[i];m.instanceMatrix.needsUpdate=true;this.attributes[i].needsUpdate=true;});
  }
}
