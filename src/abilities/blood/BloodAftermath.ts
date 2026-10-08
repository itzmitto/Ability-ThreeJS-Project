import { InstancedBufferGeometry, InstancedBufferAttribute, Mesh } from "three";
import { fluidTube } from "./BloodFluidGeometry";
import { bloodMaterial, updateBlood } from "./BloodMaterialSystem";
import { pulse, smooth } from "./SanguineEclipseConfig";
/** Hanging cohesive threads narrow, drain and snap before the last ground residue. */
export class BloodAftermath {
  readonly material =
    bloodMaterial(`uniform float uTime;uniform float uPower;attribute float aIndex;varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;
void main(){float id=aIndex,u=position.x,a=id*2.399963,r=3.0+sin(id*1.7)*2.0,age=max(0.0,uTime-12.5);float snap=1.0-smoothstep(1.1+mod(id,3.0)*.3,1.5+mod(id,3.0)*.3,age);
vec3 c=vec3(cos(a)*r,(1.0-u)*(5.0+sin(id)*2.0)-age*age*.35,sin(a)*r);c.x+=sin(u*3.0+uTime*.4)*.2;
vec3 n=vec3(position.y,0,position.z);c+=n*(.08+.07*cos(u*6.0))*uPower*snap;vLocal=c;vNormal=mat3(modelMatrix)*n;vec4 w=modelMatrix*vec4(c,1);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`);
  readonly mesh: Mesh;
  constructor() {
    const b = fluidTube(24, 8),
      g = new InstancedBufferGeometry().copy(b as InstancedBufferGeometry);
    b.dispose();
    g.setAttribute(
      "aIndex",
      new InstancedBufferAttribute(
        Float32Array.from({ length: 14 }, (_, i) => i),
        1,
      ),
    );
    this.material.uniforms.uPower = { value: 0 };
    this.mesh = new Mesh(g, this.material);
    this.mesh.frustumCulled = false;
  }
  update(t: number, count: number, detail: number): void {
    const power = pulse(11.5, 12.5, 14.1, 15.4, t);
    this.mesh.visible = power > 0.001;
    this.material.uniforms.uPower.value = power;
    this.material.uniforms.uDissolve.value = smooth(14.2, 15.4, t);
    (this.mesh.geometry as InstancedBufferGeometry).instanceCount = count;
    updateBlood(this.material, t, detail, 0.04);
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
