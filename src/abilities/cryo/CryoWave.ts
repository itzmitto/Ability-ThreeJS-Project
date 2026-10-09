import {Mesh,ShaderMaterial,SphereGeometry} from 'three';
import type {AbilityCastContext} from '../Ability';
import {VisualOwner,SurfacePulse} from '../elemental/ElementalVisuals';
import {AstralParticles,surfaceGeometry,ease,clamp01} from '../elemental/AstralVisuals';
import {cryoMaterial} from './CryoMaterials';
export class CryoWave{
  readonly overlay:Mesh;
  readonly material:ShaderMaterial;
  readonly snow:AstralParticles;
  readonly mist:AstralParticles;
  readonly pulse:SurfacePulse;
  readonly flash:Mesh;
  private readonly flashMaterial;
  constructor(owner:VisualOwner){
    this.material=owner.material(new ShaderMaterial({transparent:true,depthWrite:false,side:2,uniforms:{uTime:{value:0},uRadius:{value:0},uFade:{value:1},uDetail:{value:2}},
      vertexShader:`varying vec2 vUv;uniform float uTime;void main(){vUv=uv;vec2 p=(position.xy*2.-1.)*22.;float h=.09+sin(length(p)*5.-uTime*2.)*.018;gl_Position=projectionMatrix*modelViewMatrix*vec4(p.x,h,p.y,1.);}`,
      fragmentShader:`varying vec2 vUv;uniform float uTime,uRadius,uFade,uDetail;void main(){vec2 p=(vUv*2.-1.)*22.;float r=length(p),a=atan(p.y,p.x);float irregular=.6*sin(a*13.)+.25*sin(a*31.);float edge=1.-smoothstep(uRadius-.5,uRadius+.25,r+irregular);if(edge<.01)discard;float branch=pow(max(0.,cos(a*18.+sin(r*2.2)*.6)),20.);float forks=pow(max(0.,sin(r*7.+a*12.+sin(a*29.)*.5)),20.);vec2 cell=abs(fract(p*.43)-.5);float hex=pow(max(0.,1.-abs(max(cell.x*.866+cell.y*.5,cell.y)-.35)*26.),3.);float leading=exp(-pow((r-uRadius)/.28,2.));float cracks=.5+.5*sin(p.x*1.3+p.y*1.6+sin(p.y*3.)*.7);float dissolve=smoothstep(.12,.7,cracks+(1.-uFade));float frost=branch*.5+forks*.24+hex*.12*uDetail;vec3 col=mix(vec3(.015,.1,.18),vec3(.6,.9,1.),clamp(frost+leading,0.,1.));float alpha=edge*(.1+frost*.58+leading*.8)*uFade*(1.-dissolve*(1.-uFade));gl_FragColor=vec4(col,alpha);}` }));
    this.overlay=new Mesh(surfaceGeometry(owner,64),this.material);this.overlay.frustumCulled=false;owner.root.add(this.overlay);this.snow=new AstralParticles(owner,400,'#daf6ff','snow');this.mist=new AstralParticles(owner,80,'#9ebbc9','snow',true);this.pulse=new SurfacePulse(owner,true);
    this.flashMaterial=owner.material(cryoMaterial(2));this.flash=new Mesh(owner.geometry(new SphereGeometry(1,24,16)),this.flashMaterial);owner.root.add(this.flash);
  }
  update(t:number,snow:number,mist:number,detail:number,fade:number,context:AbilityCastContext):void{
    const age=t-4.2,compression=ease((t-3.4)/.8),radius=20*ease(age/1.8);this.overlay.visible=age>=0;const u=this.material.uniforms;u.uTime.value=t;u.uRadius.value=radius;u.uFade.value=(1-ease((t-6.2)/1.8))*fade;u.uDetail.value=detail;
    this.snow.update(t,snow,4.2,9,compression,fade,context);this.mist.update(t,mist,4.2,9,compression,fade,context);this.pulse.update(Math.max(0,age),age<0?0:(1-ease(age/3.8))*fade,3+Math.max(0,age)*10);
    this.flash.visible=t>=4.05&&t<4.65;this.flash.position.y=age<0?9:1;const s=age<0?.15+compression*.3:.5+clamp01(age/.4)*9;this.flash.scale.set(s,age<0?s:s*.18,s);this.flashMaterial.uniforms.uFade.value=age<0?compression:Math.max(0,1-age/.45)*.9;this.flashMaterial.uniforms.uTime.value=t;
  }
}
