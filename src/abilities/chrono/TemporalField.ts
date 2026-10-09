import {Mesh,ShaderMaterial} from 'three';
import {VisualOwner,gridGeometry,ease} from '../elemental/ElementalVisuals';
import type {ChronoState} from './ChronoTimeline';
export class TemporalField{
  readonly mesh:Mesh;
  private readonly material:ShaderMaterial;
  constructor(owner:VisualOwner){
    this.material=owner.material(new ShaderMaterial({transparent:true,depthWrite:false,side:2,uniforms:{uTime:{value:0},uBlue:{value:0},uFade:{value:1},uStop:{value:0}},
      vertexShader:`varying vec2 vUv;uniform float uTime,uStop;void main(){vUv=uv;vec2 p=(position.xy*2.-1.)*16.;float h=.085+sin(length(p)*3.-uTime*3.)*.035*(1.-uStop);gl_Position=projectionMatrix*modelViewMatrix*vec4(p.x,h,p.y,1.);}`,
      fragmentShader:`varying vec2 vUv;uniform float uTime,uBlue,uFade,uStop;void main(){vec2 p=(vUv*2.-1.)*16.;float r=length(p),a=atan(p.y,p.x);float outer=exp(-pow((r-11.5)/.055,2.)),inner=exp(-pow((r-6.2)/.05,2.));float marks=pow(max(0.,cos(a*12.-uTime*.1)),22.)*exp(-pow((r-10.8)/.25,2.));float waves=pow(max(0.,sin(r*5.-uTime*4.)),15.)*(1.-smoothstep(10.,15.,r));vec3 color=mix(vec3(.87,.64,.22),vec3(.18,.61,.82),uBlue);float still=exp(-r*r/70.)*uStop;gl_FragColor=vec4(mix(color,vec3(.06,.08,.1),still*.5),uFade*(outer*.45+inner*.3+marks*.32+waves*.1+still*.13));}` }));
    this.mesh=new Mesh(owner.geometry(gridGeometry(56,56)),this.material);this.mesh.frustumCulled=false;owner.root.add(this.mesh);
  }
  update(age:number,s:ChronoState):void{this.mesh.visible=age>=.25;const u=this.material.uniforms;u.uTime.value=s.time;u.uBlue.value=s.blue;u.uStop.value=s.freeze;u.uFade.value=ease((age-.25)/.55)*s.fade*(1-ease((age-6.8)/1.2));}
}
