import { Mesh, PlaneGeometry } from "three";
import { planeVertex, windMaterial, windNoise } from "./WindMaterials";

/** Temporary surface pressure, foam wisps and a moving V disturbance; the water engine stays intact. */
export class WaterWake {
  private readonly geometry = new PlaneGeometry(7, 9);
  private readonly material = windMaterial(
    planeVertex,
    `varying vec2 vUv;uniform float uTime,uOpacity,uDetail;${windNoise}
    void main(){vec2 p=(vUv-0.5)*vec2(7.0,9.0);float behind=-p.y+0.35;
      float n=noise(p*3.0+vec2(uTime*4.0,0.0));
      float width=0.15+max(0.0,behind)*0.38;
      float bow=exp(-pow((abs(p.x)-width)/(0.065+uDetail*0.025),2.0));
      float streak=exp(-p.x*p.x*18.0)*(0.3+0.7*n);
      float ripples=pow(max(0.0,sin(behind*7.0+abs(p.x)*2.0-uTime*6.0)),14.0)*exp(-p.x*p.x*0.8)*0.22;
      float taper=smoothstep(0.0,0.3,behind)*(1.0-smoothstep(1.0,6.5,behind));
      float alpha=(bow*0.45+streak*0.4+ripples*uDetail)*taper*uOpacity;
      gl_FragColor=vec4(mix(vec3(0.12,0.28,0.35),vec3(0.45,0.66,0.71),n),alpha);}`,
    { uTime: { value: 0 }, uOpacity: { value: 0 }, uDetail: { value: 1 } },
    true,
  );
  readonly mesh = new Mesh(this.geometry, this.material);
  constructor() {
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.renderOrder = 1;
    this.mesh.frustumCulled = false;
  }
  setDetail(detail: number): void {
    this.material.uniforms.uDetail.value = detail;
  }
  update(time: number, opacity: number): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uOpacity.value = opacity;
    this.mesh.visible = opacity > 0.001;
  }
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
