import { BufferGeometry, Float32BufferAttribute, Points, Vector3 } from "three";
import { windMaterial } from "./WindMaterials";
import type { WindQuality } from "./windConfig";

/** Fixed buffers: charge suction, helical wake and a drag-limited radial blast are computed on the GPU. */
export class WindParticleSystem {
  readonly flight: Points;
  readonly blast: Points;
  private readonly flightGeometry = new BufferGeometry();
  private readonly blastGeometry = new BufferGeometry();
  private readonly flightMaterial = windMaterial(
    `attribute vec4 aSeed;varying float vAlpha;uniform float uTime,uCharge,uOpacity,uPixel;uniform vec3 uOrigin,uDirection;
    void main(){float cycle=fract(aSeed.x+uTime*(uCharge>0.5?2.0:1.1));float angle=aSeed.y*6.28318+uTime*5.0+cycle*9.0;
      vec3 axis=normalize(uDirection);vec3 side=normalize(cross(axis,abs(axis.y)>0.9?vec3(1,0,0):vec3(0,1,0)));vec3 up=cross(side,axis);
      float radius=uCharge>0.5?(1.0-cycle)*0.9:0.15+cycle*0.8;
      vec3 p=uOrigin+side*cos(angle)*radius+up*sin(angle)*radius-axis*cycle*(uCharge>0.5?0.2:5.5);
      vec4 mv=viewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
      gl_PointSize=clamp((1.5+aSeed.z*2.0)*uPixel*14.0/max(1.0,-mv.z),1.0,6.0);
      vAlpha=sin(cycle*3.14159)*uOpacity;}`,
    `varying float vAlpha;void main(){vec2 p=gl_PointCoord-0.5;float a=exp(-dot(p,p)*24.0)*(1.0-smoothstep(0.18,0.25,dot(p,p)));gl_FragColor=vec4(vec3(0.64,0.79,0.82),a*vAlpha*0.55);}`,
    {
      uTime: { value: 0 },
      uCharge: { value: 1 },
      uOpacity: { value: 0 },
      uPixel: { value: 1 },
      uOrigin: { value: new Vector3() },
      uDirection: { value: new Vector3(0, 0, -1) },
    },
    true,
  );
  private readonly blastMaterial = windMaterial(
    `attribute vec4 aSeed;varying float vAlpha;uniform float uAge,uPixel,uOpacity;uniform vec3 uOrigin;
    void main(){float age=max(0.0,uAge-aSeed.z*0.1);float angle=aSeed.x*6.28318+age*0.28;
      float travel=(1.0-exp(-age*2.8))*(3.0+aSeed.y*9.0);
      float height=aSeed.w*3.0*sin(min(3.14159,age*1.8));
      vec3 p=uOrigin+vec3(cos(angle)*travel,max(0.08,height),sin(angle)*travel);
      vec4 mv=viewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
      gl_PointSize=clamp((1.4+aSeed.z*3.0)*uPixel*16.0/max(1.0,-mv.z),1.0,7.0);
      vAlpha=smoothstep(0.0,0.045,age)*(1.0-smoothstep(0.45,1.85,age))*uOpacity;}`,
    `varying float vAlpha;void main(){vec2 p=(gl_PointCoord-0.5)*2.0;float r=dot(p,p);gl_FragColor=vec4(vec3(0.65,0.81,0.85),exp(-r*3.5)*(1.0-smoothstep(0.7,1.0,r))*vAlpha*0.7);}`,
    {
      uAge: { value: 0 },
      uPixel: { value: 1 },
      uOpacity: { value: 0 },
      uOrigin: { value: new Vector3() },
    },
    true,
  );
  constructor() {
    this.prepare(this.flightGeometry, 260, 0.731);
    this.prepare(this.blastGeometry, 480, 0.417);
    this.flight = new Points(this.flightGeometry, this.flightMaterial);
    this.blast = new Points(this.blastGeometry, this.blastMaterial);
    this.flight.frustumCulled = this.blast.frustumCulled = false;
    this.flight.renderOrder = this.blast.renderOrder = 4;
  }
  private prepare(
    geometry: BufferGeometry,
    count: number,
    offset: number,
  ): void {
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i++) {
      const value = Math.sin((i + 1) * 127.1 + offset * 311.7) * 43758.5453;
      seeds[i] = value - Math.floor(value);
    }
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(count * 3), 3),
    );
    geometry.setAttribute("aSeed", new Float32BufferAttribute(seeds, 4));
  }
  setQuality(q: WindQuality, pixel: number): void {
    this.flightGeometry.setDrawRange(0, q.flight);
    this.blastGeometry.setDrawRange(0, q.blast);
    this.flightMaterial.uniforms.uPixel.value = pixel;
    this.blastMaterial.uniforms.uPixel.value = pixel;
  }
  update(
    time: number,
    origin: Vector3,
    direction: Vector3,
    charge: boolean,
    flightOpacity: number,
    impactAge: number,
    target: Vector3,
  ): void {
    const f = this.flightMaterial.uniforms;
    f.uTime.value = time;
    f.uOrigin.value.copy(origin);
    f.uDirection.value.copy(direction);
    f.uCharge.value = charge ? 1 : 0;
    f.uOpacity.value = flightOpacity;
    this.flight.visible = flightOpacity > 0.001;
    const b = this.blastMaterial.uniforms;
    b.uAge.value = Math.max(0, impactAge);
    b.uOrigin.value.copy(target);
    b.uOpacity.value = impactAge >= 0 ? 1 : 0;
    this.blast.visible = impactAge >= 0 && impactAge < 2;
  }
  get count(): number {
    return (
      (this.flight.visible ? this.flightGeometry.drawRange.count : 0) +
      (this.blast.visible ? this.blastGeometry.drawRange.count : 0)
    );
  }
  dispose(): void {
    this.flightGeometry.dispose();
    this.blastGeometry.dispose();
    this.flightMaterial.dispose();
    this.blastMaterial.dispose();
  }
}
