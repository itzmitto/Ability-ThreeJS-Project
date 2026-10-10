import { MeshPhysicalMaterial } from 'three';
import { bendingNoise } from '../bending/BendingNoise';
export function tidalWaterMaterial(){
  const uniforms={uBendTime:{value:0},uBendDetail:{value:0},uBendFade:{value:1}};
  const material=new MeshPhysicalMaterial({color:'#173c4b',roughness:.16,metalness:.26,clearcoat:1,clearcoatRoughness:.13,transparent:true,opacity:.82,depthWrite:false});
  material.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLiquid;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLiquid=position;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vLiquid;uniform float uBendTime,uBendDetail,uBendFade;${bendingNoise}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
      float ripple=bendFbm(vLiquid*5.+vec3(0.,uBendTime*1.3,-uBendTime*2.),uBendDetail);
      float rim=pow(clamp(1.-abs(dot(normalize(vNormal),normalize(vViewPosition))),0.,1.),3.);
      diffuseColor.rgb=mix(vec3(.025,.105,.14),vec3(.3,.57,.65),clamp(.24+ripple*.16+rim*.62,0.,1.));
      diffuseColor.a*=uBendFade*(.57+rim*.4);`)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(.13+ripple*.08,.07,.3);')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.12,.24,.29)*rim*.42;');
  };material.customProgramCacheKey=()=> 'tidal-liquid-v1';return {material,uniforms};
}
