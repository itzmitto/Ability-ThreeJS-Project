import { AdditiveBlending, DoubleSide, ShaderMaterial } from "three";
import type { IUniform } from "three";

export const windNoise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
`;
export function windMaterial(
  vertexShader: string,
  fragmentShader: string,
  uniforms: Record<string, IUniform>,
  additive = false,
): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    ...(additive ? { blending: AdditiveBlending } : {}),
  });
}
export const planeVertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
