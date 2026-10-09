import {ShaderMaterial,DoubleSide,AdditiveBlending} from 'three';
/** Distinct body/shard/ring treatments share fracture coordinates, not opacity. */
export function cryoMaterial(kind:0|1|2):ShaderMaterial{
  return new ShaderMaterial({transparent:true,depthWrite:kind===0,side:DoubleSide,...(kind===2?{blending:AdditiveBlending}:{}),
    uniforms:{uTime:{value:0},uEnergy:{value:0},uFade:{value:1},uGrowth:{value:1},uDetail:{value:2},uKind:{value:kind}},
    vertexShader:`varying vec3 vP,vW,vN;void main(){vP=position;vec4 p=vec4(position,1.);vec3 n=normal;
      #ifdef USE_INSTANCING
      p=instanceMatrix*p;n=mat3(instanceMatrix)*n;
      #endif
      vec4 w=modelMatrix*p;vW=w.xyz;vN=normalize(mat3(modelMatrix)*n);gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`varying vec3 vP,vW,vN;uniform float uTime,uEnergy,uFade,uGrowth,uDetail,uKind;
      void main(){float assemble=.5+.5*sin(vP.y*11.+vP.x*7.)*cos(vP.z*9.);if(assemble>uGrowth)discard;vec3 n=normalize(vN),eye=normalize(cameraPosition-vW);float fres=pow(1.-abs(dot(n,eye)),3.);vec3 p=vP*2.;float fissure=1.-smoothstep(.015,.065,min(abs(sin(p.x*7.+p.y*5.+sin(p.z*6.)*.7)),abs(sin(p.z*8.-p.y*4.))));float fine=pow(max(0.,sin(p.y*29.+p.x*17.-uTime*.55)),18.)*uDetail*.12;float spec=pow(max(0.,dot(reflect(-normalize(vec3(-.4,.8,.3)),n),eye)),42.);float flow=.5+.5*sin(p.x*6.-uTime*.7+sin(p.y*8.+uTime*.4));vec3 base=mix(vec3(.016,.12,.25),vec3(.28,.58,.7),flow*.5+fres*.3);vec3 col=base+vec3(.55,.89,1.)*(fissure+fine)*(.2+uEnergy*.9)+vec3(.75,.94,1.)*(fres*.65+spec*.55);float alpha=(uKind<.5?.62+fres*.3:uKind<1.5?.48+fres*.35:.85)*uFade;if(uKind>1.5)col=vec3(.49,.8,.94)+vec3(.6)*fissure*uEnergy;gl_FragColor=vec4(col,alpha);}`});
}
