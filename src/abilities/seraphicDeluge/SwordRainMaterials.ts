import {ShaderMaterial,AdditiveBlending,DoubleSide} from 'three';
export function swordRainMaterial(halo=false):ShaderMaterial{
  return new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending,uniforms:{uTime:{value:0},uHalo:{value:halo?1:0},uDetail:{value:2}},
    vertexShader:`attribute vec4 aRain;attribute float aPiece;varying vec3 vP,vW,vN;varying float vFade,vHeat,vSeed;uniform float uHalo;void main(){vP=position;vFade=aRain.x;vHeat=aRain.z;vSeed=aRain.w;vec3 p=position;if(aPiece<.5)p.y*=max(.008,aRain.y);else p.xz*=max(.03,aRain.y);if(uHalo>.5){p.xz*=2.5;p.y*=1.008;}vec4 w=modelMatrix*instanceMatrix*vec4(p,1.);vW=w.xyz;vN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`varying vec3 vP,vW,vN;varying float vFade,vHeat,vSeed;uniform float uTime,uHalo,uDetail;void main(){float fres=pow(1.-abs(dot(normalize(vN),normalize(cameraPosition-vW))),2.);float channel=pow(max(0.,sin(vP.y*22.-uTime*16.+vSeed*9.)),9.);float center=exp(-vP.x*vP.x*260.);vec3 col=mix(vec3(.79,.59,.24),vec3(1.,.98,.87),.58+center*.4);col+=vec3(.12,.12,.09)*channel*uDetail*.25;col*=1.+vHeat*.17;float alpha=vFade;if(uHalo>.5){col=mix(vec3(.5,.27,.055),vec3(.92,.75,.33),fres*.7);alpha*=.12+fres*.23;}gl_FragColor=vec4(col,alpha);}`});
}
export function rainTrailMaterial():ShaderMaterial{
  return new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending,uniforms:{uTime:{value:0}},
    vertexShader:`attribute float aTail;varying vec2 vUv;varying float vFade;void main(){vUv=uv;vFade=aTail;vec3 p=position;p.x*=pow(max(.015,uv.y),.72);gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);}`,
    fragmentShader:`varying vec2 vUv;varying float vFade;uniform float uTime;void main(){float x=abs(vUv.x*2.-1.),halo=pow(max(0.,1.-x),2.7),core=exp(-x*x*95.),tail=pow(vUv.y,.65);vec3 col=vec3(1.,.98,.88)*core+vec3(.77,.5,.13)*halo;gl_FragColor=vec4(col,halo*tail*vFade*.65);}`});
}
