import { MeshStandardMaterial } from 'three';
import { frostNoise } from '../frostLance/FrostLanceNoise';
import type { KingConfig } from './DrownedKingConfig';
export function createKingMaterial(sword=false){
  const uniforms={uKingTime:{value:0},uRough:{value:.44},uRust:{value:.35},uOxide:{value:.3},uRune:{value:.6},uPulse:{value:.65},uCharge:{value:0},uReveal:{value:1},uFade:{value:1},uKingTier:{value:0}};
  const material=new MeshStandardMaterial({color:'#ffffff',metalness:.74,roughness:.44,flatShading:true,fog:false});
  material.onBeforeCompile=s=>{Object.assign(s.uniforms,uniforms);
    s.vertexShader=s.vertexShader.replace('#include <common>',`#include <common>
      varying vec3 vKingLocal;`).replace('#include <begin_vertex>',`#include <begin_vertex>
      vKingLocal=position;`);
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vKingLocal;uniform float uKingTime,uRough,uRust,uOxide,uRune,uPulse,uCharge,uReveal,uFade,uKingTier;
      ${frostNoise}
      float runeLine(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));}
      vec2 kingHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
      float corrosionCell(vec2 p){vec2 cell=floor(p),f=fract(p);float d=8.;
        for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 delta=g+kingHash(cell+g)-f;d=min(d,dot(delta,delta));}return sqrt(d);}`)
    .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      float wear=snoise(vKingLocal*${sword?'2.':'18.'});roughnessFactor=clamp(uRough+wear*.12,.22,.85);`)
    .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      vec3 p=vKingLocal*${sword?'.2':'1.'};float coarse=uKingTier<.5?snoise(p*3.):fbm3(p*4.);
      float pits=uKingTier>1.5?ridged(p*22.,3):abs(snoise(p*22.));
      if(uKingTier>1.5)pits=mix(pits,1.-smoothstep(.04,.15,corrosionCell(p.xy*18.+p.z*.3)),.35);
      float rust=smoothstep(.25,.6,coarse)*uRust,oxide=smoothstep(.2,.5,snoise(p*6.+12.))*uOxide;
      vec3 steel=mix(vec3(.045,.06,.075),vec3(.25,.3,.34),clamp(.5+coarse*.3,0.,1.));
      steel=mix(steel,vec3(.11,.057,.036),rust);steel=mix(steel,vec3(.045,.115,.1),oxide);steel*=1.-pits*.16;
      float scratches=pow(max(0.,sin(p.y*200.+snoise(p*7.)*5.)),32.);steel+=vec3(.12,.15,.17)*scratches*.14;
      vec2 rp=vec2(fract(p.x*1.5+.5),fract(p.y*2.+.5));
      float glyph=min(runeLine(rp,vec2(.5,.14),vec2(.5,.86)),min(runeLine(rp,vec2(.25,.3),vec2(.73,.6)),runeLine(rp,vec2(.27,.76),vec2(.5,.53))));
      float engraving=(1.-smoothstep(.012,.032,glyph))*smoothstep(.12,.3,abs(p.z));
      engraving*=1.-smoothstep(.3,.7,abs(p.x));
      ${sword?'engraving*=1.-smoothstep(.14,.42,abs(vKingLocal.x));':''}
      steel*=1.-engraving*.8;diffuseColor.rgb*=steel;
      float energy=.3+.7*uCharge;float pulse=.6+.4*sin(uKingTime*uPulse*6.283-p.y*9.);
      totalEmissiveRadiance+=vec3(.08,.48,.34)*engraving*uRune*energy*pulse;
      ${sword?`float channel=(1.-smoothstep(.02,.085,abs(vKingLocal.x)))*step(5.,vKingLocal.y);
        float front=exp(-pow((vKingLocal.y-uCharge*60.)/4.,2.));totalEmissiveRadiance+=vec3(.25,.75,.55)*channel*front*uRune;
        if(vKingLocal.y>uReveal*65.-5.)discard;`:''}
      float rim=pow(1.-max(0.,dot(normal,normalize(vViewPosition))),4.);
      totalEmissiveRadiance+=vec3(.04,.058,.07)*rim;
      if(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)>uFade)discard;`);
  };material.customProgramCacheKey=()=>`drowned-king-${sword?'blade':'iron'}-v1`;
  return {material,uniforms,sync(c:Readonly<KingConfig>,time:number,charge:number,tier:number,fade=1){uniforms.uKingTime.value=time;uniforms.uRough.value=c.armorRoughness;uniforms.uRust.value=c.rustStrength;uniforms.uOxide.value=c.oxidationStrength;uniforms.uRune.value=c.runeBrightness;uniforms.uPulse.value=c.runePulseSpeed;uniforms.uCharge.value=charge;uniforms.uKingTier.value=tier;uniforms.uFade.value=fade;}};
}
