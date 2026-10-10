import { Color, MeshStandardMaterial } from 'three';
import type { QualityConfig } from '../quality/QualityPreset';
/** Local bind-pose coordinates are captured before skinning; grain cannot swim with bone motion. */
const grainGLSL=`
 varying vec3 vGarmentPosition;
 uniform float uCharacterDetail;
 float charHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
 float charNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(charHash(i),charHash(i+vec3(1,0,0)),f.x),mix(charHash(i+vec3(0,1,0)),charHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(charHash(i+vec3(0,0,1)),charHash(i+vec3(1,0,1)),f.x),mix(charHash(i+vec3(0,1,1)),charHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float charFbm(vec3 p){float n=charNoise(p)*.65;if(uCharacterDetail>1.5)n+=charNoise(p*2.03)*.23;if(uCharacterDetail>2.5)n+=charNoise(p*4.11)*.12;return n;}
`;
export type CharacterSurface='skin'|'fabric'|'leather'|'metal'|'hair';
export class CharacterMaterials {
  readonly detail={value:2};
  readonly owned:MeshStandardMaterial[]=[];
  /** Keep the original normal/color maps and Three's lit/skinned/depth/shadow chunks. */
  enhance(material:MeshStandardMaterial,surface:CharacterSurface):MeshStandardMaterial {
    material.metalness=surface==='metal'?.65:0;
    material.roughness=surface==='skin'?.59:surface==='leather'?.67:surface==='metal'?.34:.91;
    if(surface==='skin')material.normalScale.setScalar(.65);
    if(surface==='hair'){material.alphaTest=.45;material.transparent=false;material.depthWrite=true;return material;}
    material.onBeforeCompile=shader=>{
      shader.uniforms.uCharacterDetail=this.detail;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGarmentPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGarmentPosition=position;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+grainGLSL);
      const color=surface==='skin'?`float fine=charFbm(vGarmentPosition*180.);diffuseColor.rgb*=.96+.07*fine;
        float beard=(1.-smoothstep(1.61,1.70,vGarmentPosition.y))*smoothstep(.015,.09,vGarmentPosition.z);diffuseColor.rgb*=1.-beard*.045;`:
        surface==='fabric'?`float weave=sin(vGarmentPosition.x*980.)*sin(vGarmentPosition.y*1100.);float grain=charFbm(vGarmentPosition*55.);diffuseColor.rgb*=.90+grain*.16+weave*.022*uCharacterDetail;
        float garment=(1.-smoothstep(.38,.48,abs(vGarmentPosition.x)))*smoothstep(.8,.95,vGarmentPosition.y);float luminance=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.82,.76,.65)*luminance,garment*.9);`:
        surface==='leather'?`float pores=charFbm(vGarmentPosition*105.);float wear=charNoise(vGarmentPosition*19.);diffuseColor.rgb*=.78+.27*pores+.13*wear;
        float seam=1.-smoothstep(.001,.005,abs(abs(vGarmentPosition.x)-.113));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.17,.12,.073),seam*.28);`:
        `diffuseColor.rgb*=.95+.08*charNoise(vGarmentPosition*90.);`;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+color);
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(charNoise(vGarmentPosition*90.)-.5)*.08,.25,.98);');
      if(surface==='fabric')shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.61,smoothstep(.55,.59,abs(vGarmentPosition.x)));');
    };
    material.customProgramCacheKey=()=>`adventurer-${surface}-v1`;
    return material;
  }
  create(surface:CharacterSurface,color:string):MeshStandardMaterial {
    const material=this.enhance(new MeshStandardMaterial({color:new Color(color)}),surface);this.owned.push(material);return material;
  }
  setQuality(config:Readonly<QualityConfig>):void {this.detail.value=config.waterDetail;}
  dispose():void {for(const m of this.owned)m.dispose();this.owned.length=0;}
}
