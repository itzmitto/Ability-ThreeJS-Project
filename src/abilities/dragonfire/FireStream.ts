import { DoubleSide, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Object3D, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import type { VisualOwner } from '../elemental/ElementalVisuals';
import { ease, hash } from '../elemental/ElementalVisuals';
import { fireNoise } from '../fire/BlackFireMaterials';
import { DRAGONFIRE } from './DragonfireConfig';
import type { FireBudget } from './DragonfireConfig';
/** Shared combustion shader: broken advected edges, pointed tongues, hot patches, restrained white core. */
export function combustionMaterial():ShaderMaterial {
  return new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,
    uniforms:{uTime:{value:0}},
    vertexShader:`attribute vec4 aFire;varying vec2 vUv;varying vec4 vFire;uniform float uTime;
      void main(){vUv=uv;vFire=aFire;float s=uv.y;float envelope=sin(s*3.14159);vec3 p=position;
      p.x=(uv.x-.5)*(.18+envelope*.82)+sin(s*12.-uTime*11.+aFire.y*13.)*.12*envelope;
      p.y=uv.y-.5;p.z+=sin(s*17.-uTime*8.+aFire.y*23.)*.08*envelope;
      gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}`,
    fragmentShader:`varying vec2 vUv;varying vec4 vFire;uniform float uTime;${fireNoise}
      void main(){if(vFire.x<.003)discard;vec2 q=vec2(vUv.x*4.+vFire.y*31.,vUv.y*7.-uTime*6.);
      float n=fbm(q),curl=noise(q*1.8+vec2(3.,-uTime));float across=abs(vUv.x*2.-1.);
      float jagged=.44+n*.5;float edge=1.-smoothstep(jagged-.16,jagged+.04,across);
      float tongue=pow(max(0.,sin(vUv.y*3.14159)),.6);float holes=smoothstep(.16,.44,n+curl*.16);
      float mask=edge*tongue*holes;float hot=clamp((1.-across)*.72+n*.24+vFire.z*.1,0.,1.);
      vec3 col=mix(vec3(.22,.008,.001),vec3(.95,.085,.004),smoothstep(.1,.42,hot));
      col=mix(col,vec3(1.1,.38,.01),smoothstep(.38,.7,hot));col=mix(col,vec3(1.2,.78,.08),smoothstep(.7,.9,hot));
      col=mix(col,vec3(1.35,1.14,.65),smoothstep(.94,1.,hot)*.65);
      gl_FragColor=vec4(col,mask*vFire.x*.76);}`});
}
export interface FirePacket { birth:number;launched:boolean;hit:boolean;duration:number;seed:number;start:Vector3;end:Vector3;direction:Vector3; }
export class FireStream {
  readonly mesh:InstancedMesh;readonly material:ShaderMaterial;
  readonly packets:FirePacket[]=[];
  private readonly attributes:InstancedBufferAttribute;
  private readonly transform=new Object3D();private readonly axis=new Vector3(0,1,0);
  private readonly direction:Vector3;private readonly distance:number;
  constructor(owner:VisualOwner,readonly budget:FireBudget,initialHand:Vector3){
    this.direction=initialHand.clone().negate().normalize();if(this.direction.lengthSq()<.001)this.direction.set(0,-.2,-1).normalize();
    this.distance=Math.max(.4,Math.min(32.5,initialHand.length()));
    this.material=owner.material(combustionMaterial());const g=owner.geometry(new PlaneGeometry(1,1,3,14));
    this.attributes=new InstancedBufferAttribute(new Float32Array(DRAGONFIRE.packets*budget.layers*4),4).setUsage(DynamicDrawUsage);g.setAttribute('aFire',this.attributes);
    this.mesh=new InstancedMesh(g,this.material,DRAGONFIRE.packets*budget.layers);this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);this.mesh.frustumCulled=false;owner.root.add(this.mesh);
    for(let i=0;i<DRAGONFIRE.packets;i++)this.packets.push({birth:DRAGONFIRE.launch+i/(DRAGONFIRE.packets-1)*(DRAGONFIRE.releaseEnd-DRAGONFIRE.launch),launched:false,hit:false,duration:0,seed:hash(i+54),start:new Vector3(),end:new Vector3(),direction:new Vector3()});
  }
  update(t:number,hand:Vector3,onLaunch:(p:FirePacket)=>void,onHit:(p:FirePacket)=>void):void {
    this.material.uniforms.uTime.value=t;let count=0;const d=this.transform;
    for(const p of this.packets){const age=t-p.birth;if(age<0)continue;
      if(!p.launched){p.launched=true;p.start.copy(hand);p.end.copy(hand).addScaledVector(this.direction,this.distance);p.end.y=.08;p.direction.copy(p.end).sub(p.start).normalize();p.duration=Math.max(.075,p.start.distanceTo(p.end)/DRAGONFIRE.speed);onLaunch(p);}
      if(age>=p.duration&&!p.hit){p.hit=true;onHit(p);}
      if(age>p.duration+.22)continue;
      const travel=Math.min(age,p.duration)*DRAGONFIRE.speed,length=Math.min(4.8,Math.max(.12,travel)),width=.22+Math.min(1,travel/25)*1.05;
      const fade=(1-ease((age-p.duration)/.22))*(1-ease((t-3.4)/.5));
      for(let layer=0;layer<this.budget.layers;layer++){
        d.position.copy(p.start).addScaledVector(p.direction,travel-length*.5);d.position.y+=Math.sin(age*8+p.seed*9)*.07;
        d.quaternion.setFromUnitVectors(this.axis,p.direction);d.rotateY(layer*Math.PI/this.budget.layers+p.seed*.6);
        d.scale.set(width*(.78+layer*.035),length,1);d.updateMatrix();this.mesh.setMatrixAt(count,d.matrix);
        this.attributes.setXYZW(count,fade*(layer===0?.83:.55),p.seed+layer*.17,layer===0?1:.25,age);count++;
      }
    }
    this.mesh.count=count;this.mesh.instanceMatrix.needsUpdate=true;this.attributes.needsUpdate=true;
  }
}
