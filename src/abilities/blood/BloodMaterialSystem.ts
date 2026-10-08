import { DoubleSide, ShaderMaterial } from "three";
import { BLOOD_SURFACE } from "./BloodSurfaceShader";
export const BLOOD_VERTEX = `varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;void main(){vec4 local=vec4(position,1.0);vec3 n=normal;
#ifdef USE_INSTANCING
local=instanceMatrix*local;n=mat3(instanceMatrix)*n;
#endif
vec4 world=modelMatrix*local;vWorld=world.xyz;vLocal=position;vNormal=mat3(modelMatrix)*n;gl_Position=projectionMatrix*viewMatrix*world;}`;
export function bloodMaterial(
  vertexShader = BLOOD_VERTEX,
  transparent = false,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uDetail: { value: 1 },
      uGlow: { value: 0 },
      uDissolve: { value: 0 },
    },
    vertexShader,
    fragmentShader: BLOOD_SURFACE,
    transparent,
    depthWrite: !transparent,
    side: DoubleSide,
  });
}
export function updateBlood(
  material: ShaderMaterial,
  time: number,
  detail: number,
  glow = 0,
): void {
  material.uniforms.uTime.value = time;
  material.uniforms.uDetail.value = detail;
  material.uniforms.uGlow.value = glow;
}
