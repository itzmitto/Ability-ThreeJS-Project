import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial } from 'three';
import { riftSeed, type RiftQuality } from './RiftreaverConfig';
/** Fixed seed buffers. GPU trajectories pull in before collapse then fire outward, with no CPU particle allocations. */
export class RiftParticles {
  readonly geometry=new BufferGeometry(); readonly material:ShaderMaterial;readonly mesh:Points;
  count=0;
  constructor(){
    const seed:number[]=[],pos=new Float32Array(1300*3);
    for(let i=0;i<1300;i++)seed.push(riftSeed(i*7),riftSeed(i*7+1),riftSeed(i*7+2),riftSeed(i*7+3));
    this.geometry.setAttribute('position',new Float32BufferAttribute(pos,3));this.geometry.setAttribute('aSeed',new Float32BufferAttribute(seed,4));
    this.material=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,
      uniforms:{uAge:{value:0},uHeight:{value:18},uWidth:{value:8},uPixels:{value:450},uAlpha:{value:0},uBurst:{value:0}},
      vertexShader:`attribute vec4 aSeed;uniform float uAge,uHeight,uWidth,uPixels,uAlpha,uBurst;varying float vFade,vKind;
      void main(){float a=aSeed.x*6.283+uAge*(.2+aSeed.w*.4),r=(.6+aSeed.z*1.4)*uWidth*.5;
        float pull=1.-smoothstep(3.05,3.8,uAge);vec3 p=vec3(cos(a)*r, aSeed.y*uHeight,sin(a)*r*.45);
        p=mix(vec3(0.,uHeight*.45,0.),p,pull);
        if(uBurst>0.){float t=uBurst,drag=1.-exp(-t*3.);p=vec3(cos(a)*drag*(3.+aSeed.z*10.),uHeight*.45+sin(aSeed.y*3.14)*drag*5.-t*t*8.,sin(a)*drag*(3.+aSeed.z*10.));if(aSeed.w>.7&&aSeed.w<.83)p=vec3(cos(a)*drag*7.,.2+t*(2.+aSeed.y*5.)-t*t*5.,sin(a)*drag*7.);}
        float flow=fract(uAge*.27+aSeed.y);p.y+=sin(a*3.+uAge)*.14;
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
        vKind=aSeed.w;vFade=uAlpha*(.35+.65*sin(flow*3.14159));if(aSeed.w>.7&&aSeed.w<.83)vFade*=smoothstep(0.,.08,uBurst);
        gl_PointSize=clamp((aSeed.w>.94?3.:1.1)*uPixels/max(1.,-mv.z),1.,aSeed.w>.94?8.:3.);
      }`,
      fragmentShader:`varying float vFade,vKind;void main(){vec2 p=gl_PointCoord-.5;float r=length(p);float shape=vKind>.94?exp(-r*r*28.):max(0.,1.-r*2.);if(vKind>.98)shape=exp(-p.x*p.x*190.-p.y*p.y*7.);float a=shape*vFade;if(a<.008)discard;vec3 c=mix(vec3(.22,.08,.42),vec3(.7,.55,1.),step(.93,vKind));if(vKind>.7&&vKind<.83)c=vec3(.34,.47,.63);gl_FragColor=vec4(c,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`});
    this.mesh=new Points(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=3;
  }
  update(t:number,q:RiftQuality,height:number,width:number):void{
    this.count=q.particles;this.geometry.setDrawRange(0,this.count);const u=this.material.uniforms;
    u.uAge.value=t;u.uHeight.value=height;u.uWidth.value=width;u.uBurst.value=Math.max(0,t-3.8);
    u.uAlpha.value=t<0?0:Math.min(1,t/.65)*Math.max(0,1-Math.max(0,t-3.8)/1.6)*.38;
    u.uPixels.value=typeof window==='undefined'?450:Math.min(1100,window.innerHeight*q.detail*.1+window.innerHeight*.6);
  }
  dispose():void{this.geometry.dispose();this.material.dispose();}
}
