import { DoubleSide,ShaderMaterial } from 'three';
import { bendingNoise } from '../bending/BendingNoise';
import { SKY_CONFIG } from './SkybreakerConfig';
export function pressureMaterial(edge=false):ShaderMaterial{
  return new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,uniforms:{uTime:{value:0},uAlpha:{value:0},uDetail:{value:0},uDistortion:{value:SKY_CONFIG.distortion}},
    vertexShader:`attribute float aAlong;varying vec3 vPressure,vNormal,vView;varying float vAlong;uniform float uTime,uDistortion;void main(){vPressure=position;vAlong=aAlong;vec3 p=position+normal*sin(position.y*9.+uTime*17.)*uDistortion;vec4 mv=modelViewMatrix*vec4(p,1.);vNormal=normalize(normalMatrix*normal);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying vec3 vPressure,vNormal,vView;varying float vAlong;uniform float uTime,uAlpha,uDetail,uDistortion;${bendingNoise}
    void main(){float rim=pow(clamp(1.-abs(dot(normalize(vNormal),normalize(vView))),0.,1.),3.);float n=bendFbm(vPressure*2.7+vec3(-uTime*3.,0.,uTime),uDetail);float band=exp(-abs(fract(vAlong*3.-uTime*4.)-.5)*24.);
      float alpha=${edge?'(.38+.15*band)':'(.035+rim*.19+band*.05)'}*uAlpha;
      vec3 col=${edge?'vec3(.67,.7,.68)':'mix(vec3(.16,.19,.2),vec3(.58,.62,.61),rim*.7+band*.2)'};
      col+=n*uDistortion*(uDetail>0.5?3.:0.);gl_FragColor=vec4(col,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
}
