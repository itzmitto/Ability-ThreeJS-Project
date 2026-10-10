import { Mesh,PlaneGeometry,ShaderMaterial } from 'three';
/** A small surface-only pressure/foam overlay; no replacement water simulation. */
export class AirWaterWake{
  private readonly geometry=new PlaneGeometry(3,7);readonly material=new ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{uAge:{value:0},uAlpha:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float uAge,uAlpha;void main(){vec2 p=(vUv-.5)*vec2(3.,7.);float width=.08+max(0.,p.y)*.22;float d=(abs(p.x)-width)*17.;float bow=exp(-d*d);float stream=exp(-p.x*p.x*50.)*(.5+.5*sin(p.y*17.-uAge*15.));float taper=smoothstep(-3.,-1.,p.y)*(1.-smoothstep(1.8,3.4,p.y));gl_FragColor=vec4(vec3(.27,.36,.37),(bow*.22+stream*.18)*taper*uAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});readonly mesh=new Mesh(this.geometry,this.material);
  constructor(){this.mesh.rotation.x=-Math.PI/2;this.mesh.frustumCulled=false;this.mesh.renderOrder=1;}
  update(age:number,alpha:number):void{this.material.uniforms.uAge.value=age;this.material.uniforms.uAlpha.value=alpha;this.mesh.visible=alpha>.001;}
  dispose():void{this.geometry.dispose();this.material.dispose();}
}
