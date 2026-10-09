import { AdditiveBlending, DoubleSide, InstancedBufferAttribute, InstancedMesh, Object3D, ShaderMaterial, TorusGeometry, Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { VisualOwner } from '../elemental/ElementalVisuals';
import { ease } from '../elemental/ElementalVisuals';
interface WaterHit { birth:number; x:number; z:number; power:number; finale:boolean; }
/** Impact foam and spray sheets are a single batch; logical ocean stays unchanged. */
export class KrakenWaterInteraction {
  readonly rings:InstancedMesh;
  readonly sheets:InstancedMesh;
  private readonly hits:WaterHit[]=Array.from({length:28},()=>({birth:-100,x:0,z:0,power:0,finale:false}));
  private readonly alpha=new InstancedBufferAttribute(new Float32Array(28),1);
  private cursor=0;
  private readonly transform=new Object3D();
  private readonly world=new Vector3();
  constructor(owner:VisualOwner,private readonly context:AbilityCastContext,private readonly target:Vector3,private readonly waterOwner:object){
    const material=owner.material(new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending,
      vertexShader:'attribute float aHit;varying float vHit;void main(){vHit=aHit;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
      fragmentShader:'varying float vHit;void main(){if(vHit<.002)discard;gl_FragColor=vec4(vec3(.14,.42,.49),vHit*.52);}' }));
    const ring=owner.geometry(new TorusGeometry(1,.024,5,64));ring.setAttribute('aHit',this.alpha);
    this.rings=new InstancedMesh(ring,material,28);this.rings.frustumCulled=false;owner.root.add(this.rings);
    const sheet=owner.geometry(new TorusGeometry(1,.12,8,64,Math.PI*1.75));sheet.setAttribute('aHit',this.alpha);
    this.sheets=new InstancedMesh(sheet,material,28);this.sheets.frustumCulled=false;owner.root.add(this.sheets);
  }
  impact(t:number,x:number,z:number,power:number,finale=false,capacity=28):void {
    const hit=this.hits[this.cursor++%capacity];hit.birth=t;hit.x=x;hit.z=z;hit.power=power;hit.finale=finale;
    this.world.copy(this.target);this.world.x+=x;this.world.z+=z;
    this.context.water?.addRipple({position:this.world,strength:Math.min(1,finale?.92:power*.3),duration:finale?2.5:1.15,waveSpeed:finale?16:8,wavelength:finale?1.6:.85,radius:finale?2:.5},this.waterOwner);
  }
  update(t:number,count:number):void {
    this.rings.count=this.sheets.count=count;const d=this.transform;
    for(let i=0;i<count;i++){
      const h=this.hits[i],age=t-h.birth,life=h.finale?2.4:1.1,alive=age>=0&&age<life;
      const radius=alive?.4+age*(h.finale?10:5)*Math.sqrt(h.power):.001;
      d.position.set(h.x,.085,h.z);d.rotation.set(-Math.PI/2,0,i*.7);d.scale.set(radius,radius,1);d.updateMatrix();this.rings.setMatrixAt(i,d.matrix);
      d.position.y=.15;d.scale.set(radius*.72,radius*.72,alive?Math.sin(Math.min(1,age/.65)*Math.PI)*(h.finale?12:3)*h.power:.001);d.updateMatrix();this.sheets.setMatrixAt(i,d.matrix);
      this.alpha.setX(i,alive?(1-ease(age/life))*Math.min(1,h.power):0);
    }
    this.rings.instanceMatrix.needsUpdate=true;this.sheets.instanceMatrix.needsUpdate=true;this.alpha.needsUpdate=true;
  }
}
