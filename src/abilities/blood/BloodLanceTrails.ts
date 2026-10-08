import { InstancedBufferGeometry, InstancedBufferAttribute, Mesh } from "three";
import { fluidTube } from "./BloodFluidGeometry";
import { bloodMaterial, updateBlood } from "./BloodMaterialSystem";
import { LANCE_GLSL } from "./BloodLanceScore";
export class BloodLanceTrails {
  readonly material =
    bloodMaterial(`uniform float uTime;attribute float aIndex;varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;${LANCE_GLSL}
void main(){float id=aIndex,age=uTime-launch(id),progress=clamp(age/.52,0.0,1.0);vec3 start=lanceOrigin(id,launch(id)),end=lanceEnd(id);
float u=position.x;float p=max(0.0,progress-u*.23);vec3 tangent=normalize(end-start),side=normalize(cross(tangent,vec3(0,1,.01))),up=cross(side,tangent);
vec3 n=side*position.y+up*position.z;float live=step(0.0,age)*(1.0-smoothstep(.52,.85,age));vec3 c=mix(start,end,p*p);
c+=side*sin(u*12.0-age*7.0)*u*.15;float radius=.13*(1.0-u)*live;c+=n*radius;
vLocal=c;vNormal=mat3(modelMatrix)*n;vec4 w=modelMatrix*vec4(c,1);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`);
  readonly mesh: Mesh;
  constructor() {
    const b = fluidTube(32, 6),
      g = new InstancedBufferGeometry().copy(b as InstancedBufferGeometry);
    b.dispose();
    g.setAttribute(
      "aIndex",
      new InstancedBufferAttribute(
        Float32Array.from({ length: 28 }, (_, i) => i),
        1,
      ),
    );
    this.mesh = new Mesh(g, this.material);
    this.mesh.frustumCulled = false;
  }
  update(t: number, count: number, detail: number): void {
    this.mesh.visible = t > 6 && t < 9;
    (this.mesh.geometry as InstancedBufferGeometry).instanceCount = count;
    updateBlood(this.material, t, detail, 0.2);
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
