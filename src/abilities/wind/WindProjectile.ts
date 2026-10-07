import { Group, Mesh, PlaneGeometry } from "three";
import { WindRibbon } from "./WindRibbon";
import { PressureRingPool } from "./PressureRingPool";
import { planeVertex, windMaterial, windNoise } from "./WindMaterials";
import type { WindQuality } from "./windConfig";

/** A rotating pressure lens and helices, with a tapered four-metre turbulent tail. */
export class WindProjectile {
  readonly root = new Group();
  readonly ribbons = new WindRibbon(6);
  readonly rings = new PressureRingPool();
  private readonly geometry = new PlaneGeometry(1.5, 1.5);
  private readonly coreMaterial = windMaterial(
    planeVertex,
    `varying vec2 vUv;uniform float uTime,uOpacity,uDetail;${windNoise}
    void main(){vec2 p=(vUv-0.5)*2.0;float r=length(p),a=atan(p.y,p.x);
      float lens=exp(-r*r*19.0)*0.45;float spiral=pow(max(0.0,sin(a*3.0+r*17.0-uTime*16.0)),7.0)*exp(-r*4.0);
      float crease=exp(-pow((r-0.39-0.065*sin(a*3.0-uTime*10.0))/0.045,2.0));
      float wisps=noise(p*7.0+uTime)*exp(-r*r*5.0);
      float alpha=(lens+spiral*0.7+crease*0.3+wisps*uDetail*0.08)*uOpacity*(1.0-smoothstep(0.6,1.0,r));
      gl_FragColor=vec4(mix(vec3(0.24,0.53,0.65),vec3(0.88,0.97,0.96),exp(-r*5.0)),alpha);}`,
    { uTime: { value: 0 }, uOpacity: { value: 0 }, uDetail: { value: 1 } },
    true,
  );
  readonly core = new Mesh(this.geometry, this.coreMaterial);
  constructor() {
    this.core.renderOrder = 4;
    this.root.add(this.ribbons.mesh, this.rings.mesh, this.core);
  }
  setQuality(q: WindQuality): void {
    this.ribbons.mesh.count = q.ribbons;
    this.rings.mesh.count = q.rings;
    this.ribbons.material.uniforms.uDetail.value = q.detail;
    this.coreMaterial.uniforms.uDetail.value = q.detail;
  }
  update(
    time: number,
    strength: number,
    charge: boolean,
    compression = 0,
    travelDistance = 5.2,
  ): void {
    this.root.visible = strength > 0.001;
    const radius = charge ? 0.18 + time * 0.5 : 0.48;
    this.ribbons.material.uniforms.uWidth.value = charge ? 0.12 : 0.2;
    this.ribbons.update(
      time,
      strength * (charge ? 0.75 : 0.5),
      charge ? 0.38 : Math.min(4.8, travelDistance + 0.25),
      radius,
    );
    this.rings.update(
      time,
      strength * (charge ? 0.2 : 0.32),
      charge ? 0.35 : Math.min(5.2, travelDistance + 0.25),
    );
    this.rings.mesh.scale.setScalar(charge ? 0.35 : 1);
    this.coreMaterial.uniforms.uTime.value = time;
    this.coreMaterial.uniforms.uOpacity.value =
      strength * (1 + compression * 1.5);
    this.core.scale.setScalar((charge ? 0.5 : 0.85) * (1 - compression * 0.7));
  }
  get instanceCount(): number {
    return this.root.visible
      ? this.ribbons.mesh.count + this.rings.mesh.count
      : 0;
  }
  dispose(): void {
    this.ribbons.dispose();
    this.rings.dispose();
    this.geometry.dispose();
    this.coreMaterial.dispose();
  }
}
