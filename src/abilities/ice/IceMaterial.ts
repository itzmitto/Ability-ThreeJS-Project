import { Color, MeshStandardMaterial } from 'three';

/** Dense PBR ice: interior variation, Fresnel rims, bright facets and dithered dissolve. */
export class IceMaterial {
  readonly material = new MeshStandardMaterial({ color: '#65cce3', roughness: 0.24, metalness: 0.12, emissive: '#0b2841', emissiveIntensity: 0.4, flatShading: true });
  readonly uniforms = { uIceFade: { value: 1 }, uIceDetail: { value: 2 }, uIceBurst: { value: 0 }, uIceTint: { value: new Color('#9cecff') } };
  constructor() {
    this.material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aBarycentric; varying vec3 vIceBary; varying vec3 vIceLocal;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvIceBary=aBarycentric; vIceLocal=position;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vIceBary; varying vec3 vIceLocal; uniform float uIceFade,uIceDetail,uIceBurst; uniform vec3 uIceTint;
        float iceHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
        float dissolve=iceHash(floor(gl_FragCoord.xy)); if(dissolve>uIceFade)discard;
        float vein=exp(-abs(sin(vIceLocal.y*36.0+vIceLocal.x*19.0+vIceLocal.z*23.0+sin(vIceLocal.y*5.0)*1.5))*65.0);
        vein*=smoothstep(0.25,0.75,iceHash(floor(vIceLocal.xy*15.0)+floor(vIceLocal.z*11.0)));
        float strata=0.5+0.5*sin(vIceLocal.y*15.0+vIceLocal.x*8.0);
        diffuseColor.rgb*=mix(vec3(0.10,0.38,0.65),vec3(0.86,1.0,1.0),smoothstep(0.05,0.95,vIceLocal.y)*0.6+strata*0.23);
        if(uIceDetail>1.5)diffuseColor.rgb+=vein*vec3(0.12,0.2,0.23);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rim=pow(1.0-abs(dot(normal,normalize(vViewPosition))),3.0);
        vec3 derivative=fwidth(vIceBary);vec3 lines=smoothstep(vec3(0.0),derivative*0.9,vIceBary);
        float edge=1.0-min(min(lines.x,lines.y),lines.z);
        totalEmissiveRadiance+=uIceTint*(rim*0.46+edge*0.09+uIceBurst*0.16);
        totalEmissiveRadiance+=uIceTint*pow(smoothstep(0.72,1.0,vIceLocal.y),3.0)*0.10;
        if(uIceDetail>2.5)totalEmissiveRadiance+=uIceTint*vein*0.035;`);
    };
    this.material.customProgramCacheKey = () => 'glacial-ice-v1';
  }
  update(fade: number, burst: number): void { this.uniforms.uIceFade.value = fade; this.uniforms.uIceBurst.value = burst; }
  dispose(): void { this.material.dispose(); }
}
