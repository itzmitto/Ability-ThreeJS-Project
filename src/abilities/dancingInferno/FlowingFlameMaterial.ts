import { DoubleSide,ShaderMaterial } from 'three';
import { bendingNoise } from '../bending/BendingNoise';
import { INFERNO_CONFIG as C } from './DancingInfernoConfig';
/** Flow-aligned combustion, hot thin cores, moving torn contours and dark red turbulent fringes. */
export function flowingFlameMaterial(layer:number):ShaderMaterial{
  return new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,uniforms:{uTime:{value:0},uAlpha:{value:0},uDetail:{value:0},uLayer:{value:layer},uTurbulence:{value:C.turbulence},uSpeed:{value:C.flowSpeed},uBrightness:{value:C.brightness}},
    vertexShader:`varying vec2 vFlameUv;varying vec3 vFlameLocal;uniform float uTime,uTurbulence,uSpeed;void main(){vFlameUv=uv;vFlameLocal=position;float wave=sin(uv.x*32.-uTime*uSpeed*3.)*sin(uv.x*3.14159);vec3 p=position+normal*wave*uTurbulence;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`varying vec2 vFlameUv;varying vec3 vFlameLocal;uniform float uTime,uAlpha,uDetail,uLayer,uSpeed,uBrightness;${bendingNoise}
    void main(){vec3 flow=vec3(vFlameUv.x*17.-uTime*uSpeed,vFlameUv.y*5.,uLayer*4.7);float warp=snoise(flow*.6);float n=bendFbm(flow+vec3(0.,warp*.8,warp),uDetail);
      float filament=bendRidged(flow*1.7+vec3(2.,0.,uTime),uDetail);
      float hot=clamp(.28+(1.-abs(cos(vFlameUv.y*6.283)))*.42+n*.36-uLayer*.07,0.,1.);
      vec3 color=mix(vec3(.31,.012,.001),vec3(1.05,.105,.003),smoothstep(.08,.42,hot));
      color=mix(color,vec3(1.5,.48,.035),smoothstep(.43,.7,hot));color=mix(color,vec3(1.6,1.12,.37),smoothstep(.78,.95,hot));
      float tongues=smoothstep(-.34,.12,n+.16*sin(vFlameUv.x*45.-uTime*uSpeed*1.5));
      float taper=pow(max(.0001,sin(vFlameUv.x*3.14159)),.4);
      float alpha=uAlpha*tongues*taper*(.62-uLayer*.09);if(alpha<.007)discard;
      color*=uBrightness*(.87+filament*.13);gl_FragColor=vec4(color,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
}
