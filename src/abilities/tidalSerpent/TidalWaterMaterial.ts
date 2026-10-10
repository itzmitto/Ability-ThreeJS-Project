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
      float sheen=pow(clamp(.5+.5*snoise(vLiquid*vec3(9.,12.,4.)+vec3(0.,uBendTime,0.)),0.,1.),10.);
      diffuseColor.rgb=mix(vec3(.035,.13,.18),vec3(.48,.72,.78),clamp(.18+ripple*.24+rim*.7+sheen*.2,0.,1.));
      diffuseColor.a*=uBendFade*(.49+rim*.48);`)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(.13+ripple*.08,.07,.3);')
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(ripple*.055,-ripple*.035,ripple*.025));')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(.026,.062,.075)+vec3(.25,.4,.44)*rim*.35+vec3(.28,.36,.4)*sheen*.18;');
  };material.customProgramCacheKey=()=> 'tidal-liquid-v1';return {material,uniforms};
}
