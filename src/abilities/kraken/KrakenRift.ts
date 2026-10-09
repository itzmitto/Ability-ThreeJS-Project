// Adapted AbyssFieldMaterial.js's radial opening and sheared maelstrom.
// Copyright (c) 2026 mohamedachrefelouafi — MIT, public/licenses/LinearAbilityExtThreeJS.txt.
import { CylinderGeometry, DoubleSide, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import type { Vector3 } from 'three';
import type { VisualOwner } from '../elemental/ElementalVisuals';
import { ease } from '../elemental/ElementalVisuals';
import { KRAKEN } from './KrakenConfig';
export class KrakenRift {
  readonly field:Mesh;
  private readonly material:ShaderMaterial;
  private readonly veil:Mesh;
  private readonly veilMaterial:ShaderMaterial;
  private readonly surge:Mesh;
  private readonly surgeMaterial:ShaderMaterial;
  constructor(owner:VisualOwner,origin:Vector3,target:Vector3){
    this.material=owner.material(new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,
      uniforms:{uTime:{value:0},uOpen:{value:0},uFade:{value:1},uFlash:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vUv;uniform float uTime,uOpen,uFade,uFlash;
        void main(){vec2 p=(vUv-.5)*2.;float d=length(p),a=atan(p.y,p.x);
        float edge=.95+.035*sin(a*9.+sin(a*4.-uTime)*1.8)+.018*sin(a*19.+uTime*1.7);
        float reach=uOpen*edge;if(d>reach+.012)discard;
        float alpha=(1.-smoothstep(reach-.055,reach+.012,d))*uFade;
        float radial=clamp(d/max(.001,reach),0.,1.);
        float warp=sin(p.x*8.+uTime*.25)*sin(p.y*7.-uTime*.23);
        float phase=a*5.+(1.-radial)*5.*6.283-uTime*.43*6.283+warp*.9;
        float arms=pow(.5+.5*cos(phase),5.)*(.2+.8*radial);
        float band=exp(-pow((d-reach+.018)*85.,2.));
        float rings=pow(.5+.5*cos(radial*50.+uTime*4.),16.)*.09;
        float foam=band*(.5+.5*sin(a*45.-uTime*2.));
        vec3 c=mix(vec3(.002,.005,.011),vec3(.017,.038,.055),radial);
        c+=vec3(.035,.18,.19)*arms*.33+vec3(.08,.35,.34)*band;
        c+=vec3(.24,.38,.44)*foam*.55+vec3(.02,.075,.09)*rings;
        c+=vec3(.2,.55,.65)*uFlash*exp(-d*d*6.)*.8;
        gl_FragColor=vec4(c,alpha*.92);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }` }));
    this.field=new Mesh(owner.geometry(new PlaneGeometry(KRAKEN.radius*2.3,KRAKEN.radius*2.3)),this.material);this.field.rotation.x=-Math.PI/2;this.field.position.y=.065;this.field.renderOrder=1;owner.root.add(this.field);
    this.veilMaterial=owner.material(new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,
      uniforms:{uTime:{value:0},uFade:{value:0}},
      vertexShader:`varying vec2 vUv;uniform float uTime;void main(){vUv=uv;vec3 p=position;float h=uv.y;float a=uv.x*6.283;p.y+=sin(a*13.-uTime*3.)*.19*h;p.xz*=1.+sin(a*8.+uTime)*.025;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader:`varying vec2 vUv;uniform float uTime,uFade;void main(){float streak=pow(.5+.5*sin(vUv.x*180.+sin(vUv.y*12.+uTime)*3.),6.);float flow=.5+.5*sin(vUv.y*16.-uTime*8.+vUv.x*34.);float a=streak*flow*pow(1.-vUv.y,1.4)*uFade;gl_FragColor=vec4(mix(vec3(.04,.13,.19),vec3(.55,.72,.78),streak),a*.3);}` }));
    this.veil=new Mesh(owner.geometry(new CylinderGeometry(1,1,1,64,8,true)),this.veilMaterial);owner.root.add(this.veil);
    this.surgeMaterial=owner.material(new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,
      uniforms:{uTime:{value:0},uFade:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vUv;uniform float uTime,uFade;void main(){vec2 p=(vUv-.5)*2.;float d=length(p);float rim=exp(-pow((d-.65)*16.,2.));float flow=pow(.5+.5*sin(p.x*29.-uTime*19.+p.y*6.),7.);float a=(1.-smoothstep(.65,1.,d))*uFade;gl_FragColor=vec4(vec3(.006,.016,.03)+vec3(.08,.29,.33)*rim+vec3(.15,.35,.4)*flow*.15,a*.8);}` }));
    this.surge=new Mesh(owner.geometry(new PlaneGeometry(2.8,5)),this.surgeMaterial);this.surge.rotation.x=-Math.PI/2;
    this.surge.userData.start=origin.clone().sub(target).setY(.08);owner.root.add(this.surge);
  }
  update(t:number):void {
    const open=ease((t-.45)/1.1)*(1-ease((t-9.15)/1.5)),fade=1-ease((t-10.4)/.6);
    this.material.uniforms.uTime.value=t;this.material.uniforms.uOpen.value=open;this.material.uniforms.uFade.value=fade;this.material.uniforms.uFlash.value=Math.exp(-Math.max(0,t-KRAKEN.finale)*9)*(t>=KRAKEN.finale?1:0);
    this.field.visible=open>.001;
    this.veil.position.y=.55;this.veil.scale.set(KRAKEN.radius*open,.9*open,KRAKEN.radius*open);this.veilMaterial.uniforms.uTime.value=t;this.veilMaterial.uniforms.uFade.value=open*fade;
    const start=this.surge.userData.start as Vector3, travel=ease(t/.62);this.surge.position.copy(start).multiplyScalar(1-travel).setY(.09);this.surge.rotation.z=Math.atan2(start.x,start.z);this.surge.visible=t<.85;this.surgeMaterial.uniforms.uTime.value=t;this.surgeMaterial.uniforms.uFade.value=1-ease((t-.6)/.25);
  }
}
