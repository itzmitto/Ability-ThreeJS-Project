import { NORMAL_TRANSFORM_GLSL } from '../../effects/NormalTransform';
import { Color, ShaderMaterial } from 'three';
export function earthMaterial(): ShaderMaterial {
  return new ShaderMaterial({ transparent: true, uniforms: { uTime: { value: 0 }, uDetail: { value: 2 }, uEnergy: { value: .2 }, uFade: { value: 1 }, uAmber: { value: new Color('#ffc45b') } },
    vertexShader: `${NORMAL_TRANSFORM_GLSL}varying vec3 vLocal,vWorld,vNormal;void main(){vLocal=position;vec4 p=vec4(position,1.);vec3 n=normal;
      #ifdef USE_INSTANCING
      p=instanceMatrix*p;n=normalForTransform(instanceMatrix,n);
      #endif
      vec4 w=modelMatrix*p;vWorld=w.xyz;vNormal=normalize(normalForTransform(modelMatrix,n));gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `varying vec3 vLocal,vWorld,vNormal;uniform float uTime,uEnergy,uFade,uDetail;uniform vec3 uAmber;
      void main(){vec3 p=vLocal;float fault=abs(sin(p.x*9.+p.y*7.+sin(p.z*11.)*.65));float crossFault=abs(sin(p.z*8.-p.y*6.+sin(p.x*9.)*.5));float fissure=1.-smoothstep(.025,.105,min(fault,crossFault));float hairline=1.-smoothstep(.01,.035,abs(sin(p.y*24.+p.z*17.+sin(p.x*15.))));fissure=max(fissure,hairline*max(0.,uDetail-1.)*.22);float coarse=.5+.5*sin(p.x*21.+p.z*13.)*sin(p.y*27.);vec3 n=normalize(vNormal);vec3 eye=normalize(cameraPosition-vWorld);float light=.18+max(0.,dot(n,normalize(vec3(-.4,.85,.25))))*.7;float gloss=pow(max(0.,dot(reflect(-normalize(vec3(-.4,.85,.25)),n),eye)),30.);vec3 stone=mix(vec3(.014,.018,.027),vec3(.09,.1,.12),coarse)*light+gloss*.15;float pulse=.8+.2*sin(uTime*4.+p.y*3.);gl_FragColor=vec4(stone+uAmber*fissure*uEnergy*pulse*2.1,uFade);}` });
}
