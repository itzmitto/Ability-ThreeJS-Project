import { AdditiveBlending, DoubleSide, MeshStandardMaterial, ShaderMaterial } from 'three';
import { frostNoise } from '../frostLance/FrostLanceNoise';

// Reuses the project's attributed Ashima/MIT simplex utilities; no donor engine is copied.
export function createCometRockMaterial() {
  const uniforms = { uCometTime: { value: 0 }, uCrackGlow: { value: 1 }, uHeat: { value: 1 }, uDetail: { value: 0 } };
  const material = new MeshStandardMaterial({ color: '#ffffff', roughness: .88, metalness: .08, flatShading: true });
  material.onBeforeCompile = s => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCometLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCometLocal=position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vCometLocal;uniform float uCometTime,uCrackGlow,uHeat,uDetail;${frostNoise}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor=clamp(.82+snoise(vCometLocal*18.)*.12,.65,.97);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 p=vCometLocal;float grain=uDetail<.5?snoise(p*7.):fbm3(p*8.);
        float veins=abs(snoise(p*5.5+vec3(4.,0.,0.))+.2*snoise(p*13.));
        float fissure=1.-smoothstep(.028,.085,veins);
        float ridge=uDetail>1.5?ridged(p*18.,2):abs(snoise(p*21.));
        vec3 crust=mix(vec3(.019,.012,.008),vec3(.10,.07,.052),clamp(.5+grain,0.,1.));
        crust*=.8+ridge*.2;diffuseColor.rgb*=crust*(1.-fissure*.7);
        float pulse=.75+.25*sin(uCometTime*8.+p.y*12.);
        vec3 lava=mix(vec3(1.1,.075,.002),vec3(1.8,.63,.06),fissure);
        totalEmissiveRadiance+=lava*fissure*uCrackGlow*uHeat*pulse;
        float hotEdge=pow(1.-max(0.,dot(normal,normalize(vViewPosition))),4.);
        totalEmissiveRadiance+=vec3(.18,.028,.001)*hotEdge*uHeat;`);
  };
  material.customProgramCacheKey = () => 'ember-comet-crust-v1';
  return { material, uniforms };
}
export function createCometCoreMaterial(): ShaderMaterial {
  return new ShaderMaterial({ uniforms: { uTime: { value: 0 }, uGlow: { value: 1.35 }, uDetail: { value: 0 } },
    vertexShader: `varying vec3 vLocal,vNormal,vView;uniform float uTime;
      void main(){vLocal=position;vec3 p=position*(1.+sin(position.y*9.+uTime*16.)*.023);
      vec4 mv=modelViewMatrix*vec4(p,1.);vNormal=normalize(normalMatrix*normal);vView=-mv.xyz;
      gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying vec3 vLocal,vNormal,vView;uniform float uTime,uGlow,uDetail;${frostNoise}
      void main(){vec3 p=vLocal*3.+vec3(0.,-uTime*1.8,uTime*.4);
      float turbulence=uDetail<.5?snoise(p):fbm3(p);float face=clamp(dot(normalize(vNormal),normalize(vView)),0.,1.);
      float heat=clamp(face*.72+turbulence*.24+.13,0.,1.);
      vec3 col=mix(vec3(.65,.022,.002),vec3(1.3,.27,.012),smoothstep(.1,.5,heat));
      col=mix(col,vec3(1.65,.88,.18),smoothstep(.5,.86,heat));
      col=mix(col,vec3(1.85,1.54,.9),smoothstep(.96,1.,heat));
      gl_FragColor=vec4(col*uGlow,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
}
export function createCometFlameMaterial(): ShaderMaterial {
  return new ShaderMaterial({ transparent: true, depthWrite: false, side: DoubleSide, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uLayer: { value: 0 }, uDetail: { value: 0 }, uChargeMode: { value: 0 } },
    vertexShader: `varying vec2 vUv;varying vec3 vLocal;uniform float uTime,uLayer,uChargeMode;
      void main(){vUv=uv;vec3 p=position;float t=uv.y;
      float swirl=t*9.-uTime*15.+uLayer*2.;p.xy+=vec2(sin(swirl),cos(swirl*.83))*.14*sin(t*3.14159);
      float a=t*5.+uLayer;mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));p.xy=rot*p.xy;
      if(uChargeMode>.5){float orbit=t*7.8+uTime*18.+uLayer*3.14159;float radius=.7*(1.-t*.75);
        p=vec3(cos(orbit)*radius,sin(orbit)*radius,t*.18)+vec3(p.xy*.055,0.);}
      vLocal=p;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `varying vec2 vUv;varying vec3 vLocal;uniform float uTime,uAlpha,uLayer,uDetail;${frostNoise}
      void main(){float t=vUv.y;vec3 p=vec3(vLocal.xy*4.,t*7.-uTime*5.+uLayer*3.);
      float n=uDetail<.5?snoise(p):fbm3(p);float broken=smoothstep(-.25,.45,n+.3*(1.-t));
      float alpha=broken*(1.-smoothstep(.65,1.,t))*smoothstep(0.,.08,t)*uAlpha*.58;
      vec3 color=mix(vec3(.65,.018,.001),vec3(1.2,.27,.008),1.-t);
      color=mix(color,vec3(1.45,.73,.11),smoothstep(.25,.7,n)*(1.-t));
      if(alpha<.005)discard;gl_FragColor=vec4(color,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
}
