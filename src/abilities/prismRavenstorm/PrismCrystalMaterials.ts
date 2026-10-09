import { AdditiveBlending, DoubleSide, ShaderMaterial } from 'three';
/** Stable per-instance gemstone hue; flat normals drive hard facet reflections instead of a luminous rim shell. */
export const rainbowGLSL=`vec3 rainbow(float hue){return clamp(abs(mod(hue*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}`;
export function prismBoltMaterial():ShaderMaterial {
  return new ShaderMaterial({transparent:true,depthWrite:true,side:DoubleSide,
    uniforms:{uTime:{value:0}},
    vertexShader:`attribute vec4 aBolt;varying vec3 vW,vN,vP;varying vec4 vBolt;void main(){vP=position;vBolt=aBolt;vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);vW=w.xyz;mat3 m=mat3(instanceMatrix);vec3 n=normal/max(vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2])),vec3(.00001));vN=normalize(mat3(modelMatrix)*m*n);gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`varying vec3 vW,vN,vP;varying vec4 vBolt;uniform float uTime;${rainbowGLSL}
      void main(){if(vBolt.x<.003)discard;vec3 n=normalize(vN),eye=normalize(cameraPosition-vW);if(dot(n,eye)<0.)n=-n;
      float incidence=max(0.,dot(n,eye)),fres=pow(1.-incidence,5.);vec3 hue=rainbow(vBolt.z);
      vec3 l=normalize(vec3(-.45,.83,-.32)),rimLight=normalize(vec3(.7,.35,.5));
      float diffuse=.15+.85*max(0.,dot(n,l))+.14*max(0.,dot(n,rimLight));
      float spec=pow(max(0.,dot(n,normalize(l+eye))),100.);
      float sideSpec=pow(max(0.,dot(n,normalize(rimLight+eye))),140.);
      vec3 reflected=reflect(-eye,n);float sky=pow(max(0.,reflected.y),5.);
      vec3 gem=mix(hue,vec3(.9,.96,1.),.07);vec3 col=gem*diffuse;
      col+=mix(hue,vec3(.72,.88,1.),.28)*sky*.13;
      col+=vec3(.88,.95,1.)*(spec*.8+sideSpec*.26);
      vec3 film=rainbow(fract(vBolt.z+incidence*.075));col+=film*fres*.055;
      float seam=pow(max(0.,sin(vP.y*7.-uTime*2.+vBolt.w*12.)),22.);
      col+=hue*(.035+seam*.025)*min(vBolt.y,2.);
      gl_FragColor=vec4(col,vBolt.x);}`});
}
export function prismStreakMaterial():ShaderMaterial {
  return new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,blending:AdditiveBlending,
    uniforms:{uTime:{value:0}},
    vertexShader:'attribute vec4 aBolt;varying vec2 vUv;varying vec4 vBolt;void main(){vUv=uv;vBolt=aBolt;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;varying vec4 vBolt;${rainbowGLSL}void main(){if(vBolt.x<.003)discard;float cross=pow(max(0.,1.-abs(vUv.x*2.-1.)),2.),tip=pow(vUv.y,.55);vec3 col=mix(rainbow(vBolt.z),vec3(.92,.98,1.),cross*.5);gl_FragColor=vec4(col,cross*tip*vBolt.x*.24);}`});
}
