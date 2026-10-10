import { Group,Mesh,PlaneGeometry,ShaderMaterial,Vector3 } from 'three';
import { SweptVolume } from '../bending/SweptVolume';
import { ease } from '../bending/BendingSupport';
import { flowingFlameMaterial } from './FlowingFlameMaterial';
import { INFERNO_BUDGETS,INFERNO_CONFIG as C } from './DancingInfernoConfig';
/** Three open angular sweeps coil into a concentrated bloom, then roll outward across the surface. No explosion sphere. */
export class InfernoImpact{
  readonly root=new Group();private readonly sweeps=INFERNO_BUDGETS.map(q=>[0,1,2].map(()=>new SweptVolume(q.segments,q.sides)));
  private readonly materials=[0,1,2].map(flowingFlameMaterial);private readonly meshes=this.materials.map((m,i)=>new Mesh(this.sweeps[0][i].geometry,m));
  private readonly plane=new PlaneGeometry(13,13);private readonly surface=new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uAge:{value:0},uAlpha:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float uAge,uAlpha;void main(){vec2 p=(vUv-.5)*13.;float r=length(p),radius=.3+uAge*4.;float delta=(r-radius)*7.;float ring=exp(-delta*delta);float reflection=exp(-r*r*.42)*exp(-uAge*3.);float noise=.7+.3*sin(p.x*17.+p.y*11.+uAge*3.);gl_FragColor=vec4(vec3(.65,.16,.025),(reflection*.4+ring*.16)*noise*uAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});private readonly surfaceMesh=new Mesh(this.plane,this.surface);
  private age=0;private layer=0;
  private readonly path=(t:number,out:Vector3)=>{const angle=(t*1.5-.25)*Math.PI+this.layer*2.1+this.age*2.2,r=.65+this.layer*.3+this.age*2.6;out.set(Math.cos(angle)*r,.15+Math.sin(t*Math.PI)*(2.8+this.layer*.3)*(1-ease(this.age/1.4)),Math.sin(angle)*r);};
  private readonly radius=(t:number)=>.64*Math.sin(t*Math.PI)*(.8+.2*Math.sin(t*26-this.age*12));
  constructor(){this.meshes.forEach(m=>{m.frustumCulled=false;this.root.add(m);});this.surfaceMesh.rotation.x=-Math.PI/2;this.surfaceMesh.position.y=.035;this.surfaceMesh.renderOrder=1;this.root.add(this.surfaceMesh);this.root.visible=false;}
  update(age:number,tier:number):void{
    this.age=Math.max(0,age);this.root.visible=age>=0;if(age<0)return;const q=INFERNO_BUDGETS[tier],alpha=(1-ease(this.age/1.6))*ease(this.age/.09);
    for(let i=0;i<3;i++){this.layer=i;const m=this.meshes[i],material=this.materials[i];m.geometry=this.sweeps[tier][i].geometry;m.visible=i<q.layers&&alpha>.003;material.uniforms.uTime.value=this.age;material.uniforms.uAlpha.value=alpha;material.uniforms.uDetail.value=tier;if(m.visible)this.sweeps[tier][i].update(this.path,this.radius,.22);}
    this.surface.uniforms.uAge.value=this.age;this.surface.uniforms.uAlpha.value=C.reflection*(1-ease(this.age/2.));
  }
  dispose():void{this.sweeps.flat().forEach(s=>s.dispose());this.materials.forEach(m=>m.dispose());this.plane.dispose();this.surface.dispose();}
}
