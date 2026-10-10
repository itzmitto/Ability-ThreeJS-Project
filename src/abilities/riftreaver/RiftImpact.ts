import { DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import type { AbilityCastContext } from '../Ability';
import type { RiftConfig } from './RiftreaverConfig';
import { riftNoise } from './RiftMaterials';
export class RiftImpact {
  readonly root=new Group();readonly material:ShaderMaterial;readonly overlay:Mesh;private readonly end=new Vector3();
  constructor(){this.material=new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,
    uniforms:{uAge:{value:-1},uStrength:{value:1},uTime:{value:0}},
    vertexShader:'varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;varying vec3 vWorld;uniform float uAge,uStrength,uTime;${riftNoise}
    float squareRift(float x){return x*x;}
    void main(){vec2 p=(vUv-.5)*2.;float r=length(p),t=max(0.,uAge),n=snoise(vec3(vWorld.xz*.7,uTime*.6));
      float front=.03+(1.-exp(-t*3.5))*.86;
      float ring=exp(-squareRift((r-front)*70.))*exp(-t*1.6);
      float second=exp(-squareRift((r-front*.78)*90.))*exp(-t*2.1)*.35;
      float pulse=exp(-r*r*32.)*exp(-t*15.);float haze=exp(-squareRift((r-front*.8)*6.))*(.5+n*.5)*exp(-t*3.);
      float alpha=(ring*.5+second*.3+pulse*.7+haze*.09)*uStrength;if(alpha<.002)discard;
      gl_FragColor=vec4(mix(vec3(.025,.018,.06),vec3(.84,.66,1.1),ring+pulse),alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
    this.overlay=new Mesh(new PlaneGeometry(26,26),this.material);this.overlay.rotation.x=-Math.PI/2;this.overlay.position.y=.08;this.overlay.renderOrder=2;this.root.add(this.overlay);this.root.visible=false;
  }
  slash(ctx:AbilityCastContext,point:Vector3,direction:Vector3,index:number,c:RiftConfig,owner:object):void{
    this.end.copy(point).addScaledVector(direction,-(index===2?9:5));
    ctx.water?.addSplit({start:this.end,end:point,width:index===2?5:3,depth:index===2?.7:.25,duration:1.1},owner);
    ctx.water?.addRipple({position:point,strength:c.rippleStrength*(index===2?1:.35),duration:1.3,waveSpeed:5+index,wavelength:.6,displacementScale:index===2?.65:.25},owner);
  }
  collapse(ctx:AbilityCastContext,point:Vector3,c:RiftConfig,owner:object):void{
    for(let i=0;i<3;i++)ctx.water?.addRipple({position:point,strength:c.rippleStrength/(1+i*.6),duration:c.aftermath,waveSpeed:6+i*2,wavelength:.7+i*.25,radius:.2+i*.4,displacementScale:1,attenuation:.035},owner);
  }
  update(age:number,point:Vector3,ctx:AbilityCastContext,c:RiftConfig):void{
    this.root.visible=age>=0&&age<c.aftermath;if(!this.root.visible)return;this.root.position.copy(point);
    this.root.position.y=ctx.water?.getSurfaceHeight(point.x,point.z)??point.y;
    this.material.uniforms.uAge.value=age;this.material.uniforms.uTime.value=age+ctx.time;this.material.uniforms.uStrength.value=c.impactIntensity;
  }
  dispose():void{this.overlay.geometry.dispose();this.material.dispose();this.root.clear();}
}
