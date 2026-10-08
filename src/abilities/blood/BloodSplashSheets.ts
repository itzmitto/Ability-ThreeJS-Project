import {
  PlaneGeometry,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  Mesh,
} from "three";
import { bloodMaterial, updateBlood } from "./BloodMaterialSystem";
import { pulse } from "./SanguineEclipseConfig";
/** Curved liquid membranes erupt with cohesive lips, then perforate and drain. */
export class BloodSplashSheets {
  readonly material = bloodMaterial(
    `uniform float uTime;attribute float aIndex;varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;
vec3 sheet(float u,float v){float age=max(0.0,uTime-10.1),id=aIndex,a=id*2.399963+v*(.65+.15*sin(id));
float expansion=(1.0-exp(-age*6.0));float r=(1.0+u*(11.0+sin(id)*3.0))*expansion;
float height=sin(u*3.14159)*(.5+v)*2.0*(4.0+sin(id*1.7)*1.5)*(1.0-exp(-age*8.0))*exp(-age*.7);
vec3 p=vec3(cos(a)*r,max(.03,height-age*.15),sin(a)*r);p.y+=sin(u*19.0+v*12.0-age*5.0)*.08;
return p;}
void main(){float u=uv.x,v=uv.y-.5;vec3 p=sheet(u,v),du=sheet(u+.002,v)-p,dv=sheet(u,v+.002)-p;vec3 n=normalize(cross(du,dv));vLocal=p;vNormal=mat3(modelMatrix)*n;vec4 w=modelMatrix*vec4(p,1);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    true,
  );
  readonly mesh: Mesh;
  constructor() {
    const b = new PlaneGeometry(1, 1, 32, 12),
      g = new InstancedBufferGeometry().copy(
        b as unknown as InstancedBufferGeometry,
      );
    b.dispose();
    g.setAttribute(
      "aIndex",
      new InstancedBufferAttribute(
        Float32Array.from({ length: 10 }, (_, i) => i),
        1,
      ),
    );
    this.mesh = new Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }
  update(t: number, count: number, detail: number): void {
    const power = pulse(10.1, 10.16, 11.5, 12.5, t);
    this.mesh.visible = power > 0.001;
    (this.mesh.geometry as InstancedBufferGeometry).instanceCount = count;
    this.material.uniforms.uOpacity.value = power * 0.8;
    this.material.uniforms.uDissolve.value = Math.max(0, (t - 10.9) * 0.45);
    updateBlood(this.material, t, detail, 0.35);
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
