import { AdditiveBlending, Color, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
/** Surface fracture strokes and separated pressure crests; never a filled explosion disk. */
export class AstralChainImpact {
  readonly material=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,
    uniforms:{uAge:{value:-1},uColor:{value:new Color('#91f2ff')},uGain:{value:1}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float uAge,uGain;uniform vec3 uColor;
    void main(){vec2 p=(vUv-.5)*18.;float r=length(p),a=atan(p.y,p.x),t=max(0.,uAge);
      float ring=exp(-pow((r-t*13.)/.14,2.))*exp(-t*3.);
      float echo=exp(-pow((r-t*7.)/.24,2.))*exp(-t*2.3)*.4;
      float angular=abs(sin(a*7.+floor(r*1.6)*.8));float crack=(1.-smoothstep(.018,.06,angular))*exp(-r*.65)*exp(-t*5.);
      float flash=exp(-r*3.)*exp(-t*17.)*.5;float fade=1.-smoothstep(1.1,1.45,t);
      float alpha=(ring+echo+crack*.6+flash)*fade*uGain;if(alpha<.004)discard;
      gl_FragColor=vec4(uColor,alpha*.65);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  readonly mesh=new Mesh(new PlaneGeometry(18,18),this.material);
  constructor(){this.mesh.rotation.x=-Math.PI/2;this.mesh.visible=false;this.mesh.renderOrder=3;}
  update(age:number,p:Vector3,gain:number):void{this.mesh.visible=age>=0&&age<1.5;this.mesh.position.copy(p);this.mesh.position.y+=.045;this.material.uniforms.uAge.value=age;this.material.uniforms.uGain.value=gain;}
  dispose():void{this.mesh.removeFromParent();this.mesh.geometry.dispose();this.material.dispose();}
}
