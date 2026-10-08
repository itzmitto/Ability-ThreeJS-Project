import { AdditiveBlending, DoubleSide, GLSL3, RawShaderMaterial } from "three";
import type { ShaderMaterial, IUniform } from "three";
/** GLSL 3, light-independent shaders: opaque-looking dark mass and emissive rims are separate blend layers. */
export function fireMaterial(
  v: string,
  f: string,
  uniforms: Record<string, IUniform>,
  additive = false,
): ShaderMaterial {
  return new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader:
      "precision highp float;uniform mat4 projectionMatrix,modelViewMatrix;in vec3 position;in vec2 uv;" +
      v.replaceAll("attribute ", "in ").replaceAll("varying ", "out "),
    fragmentShader:
      "precision highp float;out vec4 fragColor;" +
      f.replaceAll("varying ", "in ").replaceAll("gl_FragColor", "fragColor"),
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    ...(additive ? { blending: AdditiveBlending } : {}),
  });
}
export const fireNoise = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}float fbm(vec2 p){return noise(p)*.57+noise(p*2.03)*.28+noise(p*4.11)*.15;}`;
export const planeVertex =
  "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}";
export const burnShader = `float burn(float t,float radius){float inner=1.-clamp(radius/4.7,0.,1.);return 1.-smoothstep(4.5+inner*1.2,6.1+inner*1.6,t);}`;
