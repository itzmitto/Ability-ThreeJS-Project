import { IcosahedronGeometry, Mesh } from "three";
import { bloodMaterial, updateBlood } from "./BloodMaterialSystem";
import type { SanguineTimeline } from "./SanguineTimeline";
export class BloodEclipseCore {
  readonly material =
    bloodMaterial(`uniform float uTime;uniform float uCompression;uniform float uGrowth;varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;
void main(){vec3 n=normalize(position);float slow=sin(n.x*4.7+uTime*.53)*cos(n.z*5.1-uTime*.37)+sin(n.y*7.1+n.x*2.3-uTime*.71)*.5;
float r=(1.0+slow*.09+pow(max(0.0,sin(n.z*3.7+n.y*4.2-uTime*.39)),4.0)*.16)*6.5*uGrowth*(1.0-uCompression*.62);
vec3 p=n*r;vLocal=p;vNormal=mat3(modelMatrix)*(n+vec3(sin(n.y*7.0-uTime*.4),cos(n.z*6.0),sin(n.x*5.0))* .07);vec4 world=modelMatrix*vec4(p,1);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`);
  private readonly geometries = [
    new IcosahedronGeometry(1, 3),
    new IcosahedronGeometry(1, 4),
    new IcosahedronGeometry(1, 5),
  ];
  readonly mesh = new Mesh(this.geometries[2], this.material);
  constructor() {
    Object.assign(this.material.uniforms, {
      uCompression: { value: 0 },
      uGrowth: { value: 0 },
    });
    this.mesh.position.set(0, 12.5, -16);
    this.mesh.frustumCulled = false;
  }
  update(tl: SanguineTimeline, detail: number): void {
    const t = tl.age;
    this.mesh.geometry = this.geometries[detail];
    this.mesh.visible = tl.eclipse > 0.001;
    this.material.uniforms.uGrowth.value = tl.eclipse;
    this.material.uniforms.uCompression.value = tl.compression;
    this.mesh.rotation.y = t * 0.08;
    updateBlood(this.material, t, detail, 0.15 + tl.compression * 0.65);
  }
  dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.material.dispose();
  }
}
