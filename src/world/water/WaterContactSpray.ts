import {
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
/** Tiny bounded shoe droplets; gravity and fade run on the GPU. */
export class WaterContactSpray {
  private readonly origins = new Float32Array(64 * 4);
  private cursor = 0;
  private expiry = 0;
  readonly geometry = new BufferGeometry();
  readonly material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `uniform float uTime;attribute vec4 aOrigin;attribute vec3 aVelocity;varying float vLife;void main(){float age=uTime-aOrigin.w;vLife=step(0.0,age)*(1.0-smoothstep(.22,.55,age));vec3 p=aOrigin.xyz+aVelocity*age+vec3(0,-4.5*age*age,0);vec4 view=modelViewMatrix*vec4(p,1);gl_Position=projectionMatrix*view;gl_PointSize=clamp(18.0/max(1.0,-view.z),1.0,3.0)*vLife;}`,
    fragmentShader: `varying float vLife;void main(){vec2 p=gl_PointCoord-.5;float r=dot(p,p);if(r>.25)discard;gl_FragColor=vec4(vec3(.09,.16,.23),(.25+exp(-length(p-vec2(-.13,.12))*12.0)*.4)*(1.0-smoothstep(.08,.25,r))*vLife);}`,
  });
  readonly points = new Points(this.geometry, this.material);
  private emitted = 0;
  constructor() {
    const velocities = new Float32Array(64 * 3);
    for (let i = 0; i < 64; i++) {
      const a = i * 2.399963;
      velocities[i * 3] = Math.cos(a) * (0.3 + (i % 3) * 0.1);
      velocities[i * 3 + 1] = 0.7 + (i % 4) * 0.15;
      velocities[i * 3 + 2] = Math.sin(a) * (0.3 + (i % 3) * 0.1);
      this.origins[i * 4 + 3] = -100;
    }
    this.geometry.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(64 * 3), 3),
    );
    this.geometry.setAttribute(
      "aOrigin",
      new Float32BufferAttribute(this.origins, 4),
    );
    this.geometry.setAttribute(
      "aVelocity",
      new Float32BufferAttribute(velocities, 3),
    );
    this.points.frustumCulled = false;
    this.points.visible = false;
  }
  emit(position: Vector3, time: number, count: number): void {
    for (let n = 0; n < count; n++) {
      const k = (this.cursor++ % 64) * 4;
      this.origins[k] = position.x;
      this.origins[k + 1] = 0.04;
      this.origins[k + 2] = position.z;
      this.origins[k + 3] = time;
    }
    this.geometry.getAttribute("aOrigin").needsUpdate = true;
    this.expiry = time + 0.55;
    this.emitted = Math.min(64, this.emitted + count);
  }
  get count(): number {
    return this.points.visible ? this.emitted : 0;
  }
  update(time: number): void {
    this.material.uniforms.uTime.value = time;
    this.points.visible = time < this.expiry;
    if (!this.points.visible) this.emitted = 0;
  }
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.points.removeFromParent();
  }
}
