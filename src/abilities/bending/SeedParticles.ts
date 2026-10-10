import { BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial, type Blending } from 'three';
import { seed } from './BendingSupport';
/** Infrastructure only: each element supplies its own GPU motion and fragment shading. */
export class SeedParticles {
  readonly geometry=new BufferGeometry();readonly material:ShaderMaterial;readonly mesh:Points;
  count=0;
  constructor(capacity:number,vertexBody:string,fragmentBody:string,blending:Blending,vertexDeclarations=''){
    const data=new Float32Array(capacity*4);for(let i=0;i<data.length;i++)data[i]=seed(i+71);
    this.geometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(capacity*3),3));this.geometry.setAttribute('aSeed',new Float32BufferAttribute(data,4));
    this.material=new ShaderMaterial({transparent:true,depthWrite:false,blending,uniforms:{uTime:{value:0},uImpact:{value:0},uRelease:{value:0},uLength:{value:1},uPixels:{value:500},uAlpha:{value:0}},
      vertexShader:`attribute vec4 aSeed;uniform float uTime,uImpact,uRelease,uLength,uPixels,uAlpha;varying float vFade,vKind;${vertexDeclarations}void main(){vec3 p=vec3(0.);float size=2.;vFade=uAlpha;vKind=aSeed.w;${vertexBody}vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*uPixels/max(1.,-mv.z),1.,42.);}`,
      fragmentShader:`varying float vFade,vKind;void main(){vec2 q=gl_PointCoord-.5;float alpha=0.;vec3 color=vec3(1.);${fragmentBody}if(alpha<.005)discard;gl_FragColor=vec4(color,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});this.mesh=new Points(this.geometry,this.material);this.mesh.frustumCulled=false;
  }
  update(age:number,impact:number,length:number,capacity:number,alpha:number,release=0):void{
    this.count=capacity;this.geometry.setDrawRange(0,capacity);const u=this.material.uniforms;u.uTime.value=age;u.uImpact.value=impact;u.uLength.value=length;u.uAlpha.value=alpha;u.uRelease.value=release;
    u.uPixels.value=typeof window==='undefined'?500:Math.min(1000,window.innerHeight*.7);
  }
  dispose():void{this.geometry.dispose();this.material.dispose();}
}
