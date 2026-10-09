import {Group,InstancedMesh,Object3D,SphereGeometry,InstancedBufferAttribute} from 'three';
import type {BufferGeometry} from 'three';
import type {AbilityCastContext} from '../Ability';
import {VisualOwner,ease,hash} from '../elemental/ElementalVisuals';
import {Vector3} from 'three';
import {clockRingSegment,clockPlate,clockHandPiece,HAND_CENTERS} from './ClockRingGeometry';
import {clockMaterial} from './ClockMaterials';
import type {ChronoState} from './ChronoTimeline';
/** The clock stays anchored; every arc, marker and hand section has its own fracture pivot. */
export class TemporalClock{
  readonly root=new Group();
  readonly rings:InstancedMesh[]=[];
  readonly markers:InstancedMesh;
  readonly hands:InstancedMesh[]=[];
  readonly ghosts:InstancedMesh[]=[];
  private readonly ringGeometry:BufferGeometry[][]=[];
  private readonly material;
  private readonly handMaterial;
  private readonly ghostMaterial;
  private readonly dummy=new Object3D();
  private readonly pivot:InstancedMesh;
  constructor(owner:VisualOwner,context:AbilityCastContext,target:Vector3){
    const normal=new Vector3().subVectors(context.player.position,target).setY(0);if(normal.lengthSq()<.001)normal.copy(context.cameraForward).negate().setY(0);if(normal.lengthSq()<.001)normal.set(0,0,1);normal.normalize();this.root.position.y=10.5;this.root.rotation.set(.16,Math.atan2(normal.x,normal.z),0);owner.root.add(this.root);
    this.material=owner.material(clockMaterial());this.handMaterial=owner.material(clockMaterial(true));this.ghostMaterial=owner.material(clockMaterial(true));
    for(let i=0;i<8;i++){const geometries=[3,5,8].map(n=>owner.geometry(clockRingSegment(32,n)));this.ringGeometry.push(geometries);const m=new InstancedMesh(geometries[1],this.material,32);m.frustumCulled=false;this.rings.push(m);this.root.add(m);}
    this.markers=new InstancedMesh(owner.geometry(clockPlate(12)),this.material,12);this.markers.frustumCulled=false;this.root.add(this.markers);
    for(let i=0;i<3;i++){const m=new InstancedMesh(owner.geometry(clockHandPiece(i,3)),this.handMaterial,3);m.frustumCulled=false;this.hands.push(m);this.root.add(m);const ghost=new InstancedMesh(owner.geometry(clockHandPiece(i,9)),this.ghostMaterial,9);ghost.frustumCulled=false;this.ghosts.push(ghost);this.root.add(ghost);}
    const pivot=owner.geometry(new SphereGeometry(.38,20,12));pivot.setAttribute('aTemporal',new InstancedBufferAttribute(new Float32Array([1,.1,1,0]),4));this.pivot=new InstancedMesh(pivot,this.handMaterial,1);this.root.add(this.pivot);
  }
  update(age:number,s:ChronoState,count:number,segments:number,hands:number,ghosts:number,detail:number):void{
    for(const m of [this.material,this.handMaterial,this.ghostMaterial]){m.uniforms.uTime.value=s.time;m.uniforms.uBlue.value=s.blue;m.uniforms.uDetail.value=detail;}
    const d=this.dummy,after=age-5.8;
    for(let ring=0;ring<8;ring++){const mesh=this.rings[ring];mesh.geometry=this.ringGeometry[ring][detail-1];mesh.count=segments;mesh.visible=ring<count;const attr=mesh.geometry.getAttribute('aTemporal') as InstancedBufferAttribute,radius=[7.15,6.4,5.4,4.6,3.75,2.9,2.2,1.55][ring],speed=(ring%2===0?1:-1)*(.11+ring*.057),build=ease((age-.7-ring*.08)/.65);
      for(let i=0;i<segments;i++){const seed=hash(ring*41+i+73),theta=i/segments*Math.PI*2+s.time*speed;
        const radial=(radius+s.fracture*(.5+seed*2.5))*(1-s.collapse*s.collapse),spread=after>=0?Math.max(0,after)*(4+seed*10):0;
        d.position.set(Math.cos(theta)*(radial+spread),Math.sin(theta)*(radial+spread)-(after>=0?after*after*.7:0),(ring%3-1)*.38*(1-s.collapse)+s.fracture*Math.sin(i*2.4)*1.8*(1-s.collapse)+(after>=0?Math.sin(theta*2)*after*2:0));
        d.rotation.set(s.fracture*Math.sin(i+age)*.32,s.fracture*Math.cos(i+age)*.35,theta+s.fracture*Math.sin(i)*.3+(after>=0?after*(seed-.5):0));const scale=radius*build*(after<0?1-s.collapse*.92:.27);d.scale.set(scale,scale,scale);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);attr.setXYZW(i,build*s.fade,seed,.45+s.blue*.8+s.collapse,0);
      }mesh.instanceMatrix.needsUpdate=attr.needsUpdate=true;
    }
    const mark=this.markers.geometry.getAttribute('aTemporal') as InstancedBufferAttribute;
    for(let i=0;i<12;i++){const angle=Math.PI*.5-i*Math.PI/6+s.time*.024,radial=(6.65+s.fracture*.9)*(1-s.collapse*s.collapse)+(after>=0?after*(5+hash(i)*5):0);d.position.set(Math.cos(angle)*radial,Math.sin(angle)*radial-(after>=0?after*after*.6:0),.18+s.fracture*Math.sin(i)*.8*(1-s.collapse));d.rotation.set(s.fracture*i*.05,s.fracture*.3,angle-Math.PI*.5);const scale=ease((age-1.03)/.55)*(after>=0?.65:1-s.collapse*.85);d.scale.set(i%3===0?1.35:1,1.2,1);d.scale.multiplyScalar(scale);d.updateMatrix();this.markers.setMatrixAt(i,d.matrix);mark.setXYZW(i,s.fade*scale,hash(i),.75,0);}this.markers.instanceMatrix.needsUpdate=mark.needsUpdate=true;
    for(let piece=0;piece<3;piece++){const mesh=this.hands[piece],attr=mesh.geometry.getAttribute('aTemporal') as InstancedBufferAttribute,ghost=this.ghosts[piece],ghostAttr=ghost.geometry.getAttribute('aTemporal') as InstancedBufferAttribute;mesh.count=hands;ghost.count=hands*ghosts;
      for(let hand=0;hand<hands;hand++){const angle=s.time*[1.25,.34,3.7][hand]+[0,1.8,-.7][hand],length=[1,.65,1.08][hand],center=HAND_CENTERS[piece]*length;
        d.position.set(-Math.sin(angle)*center*(1-s.collapse)+s.fracture*Math.cos(hand*3+piece)*1.3*(1-s.collapse),Math.cos(angle)*center*(1-s.collapse)+s.fracture*Math.sin(hand+piece*3)*1.3*(1-s.collapse),.3+hand*.12+s.fracture*(piece-1)*.7*(1-s.collapse));
        if(after>=0){d.position.x+=Math.cos(hand*2.4+piece)*after*7;d.position.y+=Math.sin(hand*2.4+piece)*after*7-after*after;d.position.z+=Math.sin(piece+hand)*after*2;}
        d.rotation.set(s.fracture*Math.sin(piece)*.2,s.fracture*Math.cos(piece)*.3,angle+s.fracture*(piece-1)*.35);const scale=ease((age-1.18)/.5)*(after>=0?.6:1-s.collapse*.94);d.scale.set(hand===2?.32:1,length,1);d.scale.multiplyScalar(scale);d.updateMatrix();mesh.setMatrixAt(hand,d.matrix);attr.setXYZW(hand,scale*s.fade,hand*.2,1+s.collapse,0);
        for(let g=0;g<ghosts;g++){const oldAngle=after>=0?(1.15+after*.15)*[1.25,.34,3.7][hand]+[0,1.8,-.7][hand]-(g+1)*.12:angle-(g+1)*.18*(s.blue>0?-1:1),ghostCollapse=after>=0?.42:s.collapse;d.position.set(-Math.sin(oldAngle)*center*(1-ghostCollapse),Math.cos(oldAngle)*center*(1-ghostCollapse),.16+hand*.1-g*.04);d.rotation.set(0,0,oldAngle);d.updateMatrix();const idx=hand*ghosts+g;ghost.setMatrixAt(idx,d.matrix);ghostAttr.setXYZW(idx,(s.freeze?0:.11)*(1-g*.22)*scale*s.fade,hand*.2,.5,0);}
      }mesh.instanceMatrix.needsUpdate=attr.needsUpdate=true;ghost.instanceMatrix.needsUpdate=ghostAttr.needsUpdate=true;
    }
    this.pivot.visible=age<5.6||age>6.1;const pivotAttr=this.pivot.geometry.getAttribute('aTemporal') as InstancedBufferAttribute;pivotAttr.setXYZW(0,s.build*(after>=0?.15:1)*s.fade,.1,1,0);pivotAttr.needsUpdate=true;
  }
}
