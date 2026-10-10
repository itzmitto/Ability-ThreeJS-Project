import { MeshStandardMaterial } from 'three';
import { bendingNoise } from '../bending/BendingNoise';
import { TITAN_CONFIG } from './TitanFistConfig';
export function titanRockMaterial(){
  const uniforms={uRockTime:{value:0},uRockDetail:{value:0},uRockGlow:{value:TITAN_CONFIG.mineralGlow},uRockAlpha:{value:1}};
  const material=new MeshStandardMaterial({color:'#ffffff',roughness:.86,metalness:.16,flatShading:true,transparent:true});
  material.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStone;').replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=position;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vStone;uniform float uRockTime,uRockDetail,uRockGlow,uRockAlpha;${bendingNoise}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
      float grain=bendFbm(vStone*8.,uRockDetail);float ridge=bendRidged(vStone*16.,uRockDetail);
      float mineral=(1.-smoothstep(.012,.038,abs(snoise(vStone*4.+vec3(13.)))))*smoothstep(-.2,.3,grain);
      diffuseColor.rgb=mix(vec3(.055,.063,.058),vec3(.24,.27,.22),clamp(.45+grain*.6,0.,1.))*(.76+ridge*.24);diffuseColor.a*=uRockAlpha;`)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(.86+grain*.1,.7,.98);')
      .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float rim=pow(clamp(1.-abs(dot(normal,normalize(vViewPosition))),0.,1.),4.);
      totalEmissiveRadiance+=vec3(.59,.68,.53)*mineral*uRockGlow+vec3(.075,.079,.062)*(rim+.25);`);
  };material.customProgramCacheKey=()=> 'titan-basalt-v1';return {material,uniforms};
}
