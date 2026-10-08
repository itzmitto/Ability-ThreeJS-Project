import { InstancedBufferGeometry, InstancedBufferAttribute, Mesh } from "three";
import { fluidTube } from "./BloodFluidGeometry";
import { bloodMaterial, updateBlood } from "./BloodMaterialSystem";
import { LANCE_GLSL } from "./BloodLanceScore";
export class BloodLanceImpact {
  readonly material =
    bloodMaterial(`uniform float uTime;attribute float aIndex;varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;${LANCE_GLSL}
void main(){float id=floor(aIndex/3.0),arm=mod(aIndex,3.0),age=uTime-launch(id)-.52;float life=step(0.0,age)*(1.0-smoothstep(.6,1.25,age));float u=position.x,a=id*2.4+arm*2.094+u*.5;
float radius=age*3.0*u;vec3 radial=vec3(cos(a),0,sin(a));vec3 n=radial*position.y+vec3(0,position.z,0);
vec3 p=lanceEnd(id)+radial*radius+vec3(0,sin(u*3.14159)*max(0.0,age*4.5-age*age*3.5),0);p+=n*.09*(1.0-u)*life;
if(life<.001)p.y=-2.0;vLocal=p;vNormal=mat3(modelMatrix)*n;vec4 w=modelMatrix*vec4(p,1);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`);
  readonly mesh: Mesh;
  constructor() {
    const b = fluidTube(20, 6),
      g = new InstancedBufferGeometry().copy(b as InstancedBufferGeometry);
    b.dispose();
    g.setAttribute(
      "aIndex",
      new InstancedBufferAttribute(
        Float32Array.from({ length: 84 }, (_, i) => i),
        1,
      ),
    );
    this.mesh = new Mesh(g, this.material);
    this.mesh.frustumCulled = false;
  }
  update(t: number, count: number, detail: number): void {
    this.mesh.visible = t > 6.5 && t < 10;
    (this.mesh.geometry as InstancedBufferGeometry).instanceCount = count * 3;
    updateBlood(this.material, t, detail, 0.25);
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
