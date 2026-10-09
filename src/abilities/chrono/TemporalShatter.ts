import {InstancedMesh,Mesh,Object3D,ShaderMaterial,SphereGeometry} from 'three';
import type {InstancedBufferAttribute} from 'three';
import {VisualOwner,ease,hash} from '../elemental/ElementalVisuals';
import {clockRingSegment} from './ClockRingGeometry';
import {clockMaterial,temporalWaveMaterial} from './ClockMaterials';
import type {ChronoState} from './ChronoTimeline';
export class TemporalShatter{
  readonly shell:Mesh;
  readonly arcs:InstancedMesh;
  readonly core:Mesh;
  readonly flash:Mesh;
  private readonly material;
  private readonly arcMaterial;
  private readonly arcData:InstancedBufferAttribute;
  private readonly coreMaterial:ShaderMaterial;
  private readonly flashMaterial:ShaderMaterial;
  private readonly dummy=new Object3D();
  private readonly geometries:SphereGeometry[];
  constructor(owner:VisualOwner){
    this.material=owner.material(temporalWaveMaterial());this.geometries=[24,40,64].map(n=>owner.geometry(new SphereGeometry(1,n,Math.round(n*.4),0,Math.PI*2,0,Math.PI*.55)));this.shell=new Mesh(this.geometries[1],this.material);this.shell.frustumCulled=false;owner.root.add(this.shell);
    const g=owner.geometry(clockRingSegment(48,6));this.arcData=g.getAttribute('aTemporal') as InstancedBufferAttribute;this.arcMaterial=owner.material(clockMaterial(true));this.arcs=new InstancedMesh(g,this.arcMaterial,48);this.arcs.frustumCulled=false;owner.root.add(this.arcs);
    this.coreMaterial=owner.material(new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uFade:{value:0},uTime:{value:0}},vertexShader:`varying vec3 vW,vN,vP;void main(){vP=position;vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`varying vec3 vW,vN,vP;uniform float uFade,uTime;void main(){float rim=pow(1.-abs(dot(normalize(vN),normalize(cameraPosition-vW))),3.);float arc=pow(max(0.,sin(atan(vP.z,vP.x)*4.+vP.y*11.-uTime*8.)),18.);gl_FragColor=vec4(vec3(.006,.015,.045)+vec3(.55,.94,1.)*rim+vec3(.77,.56,.17)*arc*.3,uFade*(.45+rim*.4));}` }));
    this.core=new Mesh(owner.geometry(new SphereGeometry(.5,24,16)),this.coreMaterial);this.core.position.y=10.5;owner.root.add(this.core);
    this.flashMaterial=owner.material(new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uFade:{value:0}},vertexShader:`varying vec3 vW,vN;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`varying vec3 vW,vN;uniform float uFade;void main(){float r=pow(1.-abs(dot(normalize(vN),normalize(cameraPosition-vW))),2.);gl_FragColor=vec4(mix(vec3(1.,.94,.74),vec3(.52,.92,1.),r),uFade*.7);}` }));
    this.flash=new Mesh(owner.geometry(new SphereGeometry(1,24,16)),this.flashMaterial);this.flash.position.y=10.5;owner.root.add(this.flash);
  }
  update(age:number,s:ChronoState,detail:number):void{
    const after=age-5.8;this.core.visible=age>=5.5&&age<5.85;this.coreMaterial.uniforms.uTime.value=s.time;this.coreMaterial.uniforms.uFade.value=ease((age-5.5)/.06)*(1-ease((age-5.75)/.1));this.core.scale.setScalar(.7+s.collapse*.3);
    this.shell.visible=after>=0&&after<2.2;this.shell.geometry=this.geometries[detail-1];this.shell.position.y=.16;const r=20*ease(after/1.4);this.shell.scale.set(Math.max(.001,r),Math.max(.001,r*.24),Math.max(.001,r));this.material.uniforms.uTime.value=age;this.material.uniforms.uFade.value=after>=0?(1-ease(after/2.2))*s.fade:0;
    this.arcs.count=detail*16;this.arcs.visible=after>=0;this.arcMaterial.uniforms.uTime.value=s.time;this.arcMaterial.uniforms.uBlue.value=.75;const d=this.dummy;
    for(let i=0;i<this.arcs.count;i++){const wave=Math.floor(i/16),a=i%16*Math.PI/8,p=Math.max(0,after-wave*.15),radius=(15+wave*2)*ease(p/(.85+wave*.2));d.position.set(Math.cos(a)*radius,.18+wave*.25,Math.sin(a)*radius);d.rotation.set(-Math.PI*.5,0,-a);const size=Math.max(.001,radius*.85);d.scale.set(size,size,size);d.updateMatrix();this.arcs.setMatrixAt(i,d.matrix);this.arcData.setXYZW(i,(1-ease(p/2))*s.fade,hash(i),1,0);}this.arcs.instanceMatrix.needsUpdate=this.arcData.needsUpdate=true;
    this.flash.visible=after>=0&&after<.42;this.flash.scale.setScalar(.35+Math.max(0,after)*8);this.flashMaterial.uniforms.uFade.value=Math.max(0,1-after/.42)*s.fade;
  }
}
