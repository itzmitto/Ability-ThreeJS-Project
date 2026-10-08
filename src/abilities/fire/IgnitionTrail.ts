import { Mesh, PlaneGeometry, Vector3 } from "three";
import { fireMaterial, fireNoise } from "./BlackFireMaterials";
export class IgnitionTrail {
  readonly geometry = new PlaneGeometry(1, 1, 1, 24);
  readonly start = new Vector3();
  readonly end = new Vector3();
  readonly material = fireMaterial(
    `varying vec2 vUv;uniform vec3 uStart,uEnd;void main(){vUv=uv;vec3 d=uEnd-uStart;vec2 n=vec2(-d.z,d.x)/max(.001,length(d.xz));vec3 p=mix(uStart,uEnd,uv.y);p.xz+=n*(uv.x-.5)*1.1;p.y=.075;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    `${fireNoise}varying vec2 vUv;uniform float uTime,uDetail;void main(){float progress=clamp((uTime-.18)/.30,0.,1.);float travel=exp(-pow((vUv.y-progress)/.09,2.));float wake=smoothstep(progress-.28,progress,vUv.y)*step(vUv.y,progress);float x=abs(vUv.x-.5+sin(vUv.y*41.-uTime*13.)*.05);float shape=exp(-x*x/.009);float n=fbm(vec2(vUv.x*7.,vUv.y*90.-uTime*9.));float opacity=(travel+wake*.6)*shape*(.3+n*.7)*(1.-smoothstep(.5,.95,uTime));gl_FragColor=vec4(mix(vec3(.10,.005,.08),vec3(.85,.013,.035),n)*1.4,opacity);}`,
    {
      uStart: { value: this.start },
      uEnd: { value: this.end },
      uTime: { value: 0 },
      uDetail: { value: 1 },
    },
    true,
  );
  readonly mesh = new Mesh(this.geometry, this.material);
  constructor() {
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
  }
  setOrigin(local: Vector3): void {
    this.start.copy(local);
    this.start.y = 0;
    this.end.set(0, 0, 0);
  }
  update(t: number, detail: number): void {
    this.material.uniforms.uTime.value = t;
    this.material.uniforms.uDetail.value = detail;
    this.mesh.visible = t >= 0.18 && t < 0.95;
  }
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
