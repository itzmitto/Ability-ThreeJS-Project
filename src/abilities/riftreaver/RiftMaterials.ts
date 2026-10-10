import { DoubleSide, MeshStandardMaterial, ShaderMaterial } from 'three';
import { frostNoise } from '../frostLance/FrostLanceNoise';
import type { RiftConfig } from './RiftreaverConfig';
export const riftNoise = `${frostNoise}
float riftFbm(vec3 p,float detail){float n=snoise(p)*.58;if(detail>.5)n+=snoise(p*2.03+17.)*.28;if(detail>1.5)n+=snoise(p*4.11+31.)*.14;return n;}
float riftRidged(vec3 p){return clamp(1.-abs(snoise(p)),0.,1.);}
`;
export function createRiftEdgeMaterial(c:RiftConfig) {
  const uniforms={uRiftTime:{value:0},uOpen:{value:1},uEnergy:{value:c.edgeGlow},uDetail:{value:1},uAlpha:{value:1}};
  const material=new MeshStandardMaterial({color:'#18152c',metalness:.48,roughness:.61,transparent:true,depthWrite:true});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='uniform float uOpen,uRiftTime; varying vec3 vRiftLocal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal.x/=max(uOpen,.001);');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vRiftLocal=position;transformed.x*=uOpen;
      transformed.z+=sin(position.y*4.+uRiftTime*21.)*.014*uOpen;`);
    shader.fragmentShader=`uniform float uRiftTime,uEnergy,uDetail,uAlpha;varying vec3 vRiftLocal;${riftNoise}\n`+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float grain=riftFbm(vRiftLocal*7.,uDetail);
      diffuseColor.rgb*=.65+grain*.35;
      diffuseColor.a*=uAlpha;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float fissure=pow(riftRidged(vRiftLocal*3.7+vec3(0.,grain*.7,0.)),24.);
      float sweep=pow(.5+.5*sin(vRiftLocal.y*1.7-uRiftTime*9.),12.);
      float rim=pow(clamp(1.-abs(dot(normal,normalize(vViewPosition))),0.,1.),4.);
      totalEmissiveRadiance+=mix(vec3(.26,.06,.66),vec3(1.5,1.1,1.9),sweep)*uEnergy*(fissure*.5+rim*.24+sweep*.12);`);
  };
  material.customProgramCacheKey=()=> 'riftreaver-obsidian-v1';return {material,uniforms};
}
export function createRiftVoidMaterial(c:RiftConfig):ShaderMaterial {
  return new ShaderMaterial({side:DoubleSide,depthWrite:true,
    uniforms:{uTime:{value:0},uOpen:{value:0},uCollapse:{value:0},uDetail:{value:1},uBrightness:{value:c.voidBrightness},uNoiseScale:{value:c.noiseScale},uTurbulence:{value:c.turbulence}},
    vertexShader:`uniform float uOpen;varying vec2 vUv;varying vec3 vLocal;void main(){vUv=uv;vLocal=position;vec3 p=position;p.x*=uOpen;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader:`varying vec2 vUv;varying vec3 vLocal;uniform float uTime,uOpen,uCollapse,uDetail,uBrightness,uNoiseScale,uTurbulence;${riftNoise}
    void main(){vec2 p=(vUv-.5)*vec2(2.,3.8);float center=exp(-dot(p,p)*2.2);
      vec3 space=vec3(p*uNoiseScale, vLocal.z*.4);space.xy+=vec2(sin(uTime*.3+space.y),cos(uTime*.2+space.x))*.06*uTurbulence;
      float cloud=riftFbm(space*2.+vec3(0.,uTime*.12,uTime*.06),uDetail);
      float vein=pow(riftRidged(space*7.+vec3(uTime*.07,0.,0.)),34.);
      vec2 cell=floor((p+vec2(uTime*.007,-uTime*.009))*70.);float h=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
      vec2 st=fract((p+vec2(uTime*.007,-uTime*.009))*70.)-.5;
      float stars=step(.994,h)*exp(-dot(st,st)*160.);
      float rim=pow(abs(p.x),7.);
      vec3 color=vec3(.002,.002,.007)+vec3(.055,.025,.14)*max(0.,cloud+.18)*(1.-center*.75)*uBrightness;
      color+=vec3(.3,.15,.65)*vein*.035+vec3(.68,.68,1.)*stars*.8;
      color+=vec3(.14,.045,.3)*rim*.17*(.6+.4*sin(vLocal.y*2.-uTime*5.));
      color*=1.-uCollapse*.85;gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
}
export function createRiftEnergyMaterial():ShaderMaterial {
  return new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,
    uniforms:{uTime:{value:0},uAlpha:{value:1},uOpen:{value:1},uGlow:{value:1}},
    vertexShader:'uniform float uOpen;varying vec3 vLocal;void main(){vLocal=position;vec3 p=position;p.x*=uOpen;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader:`uniform float uTime,uAlpha,uGlow;varying vec3 vLocal;void main(){float pulse=.65+.35*pow(.5+.5*sin(vLocal.y*20.-uTime*17.),6.);gl_FragColor=vec4(vec3(.8,.56,1.2)*uGlow*pulse,uAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    }`});
}
