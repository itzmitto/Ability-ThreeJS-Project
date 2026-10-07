import {
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  PlaneGeometry,
} from "three";
import { WindRibbon } from "./WindRibbon";
import { windMaterial, planeVertex, windNoise } from "./WindMaterials";
import type { WindQuality } from "./windConfig";
import { fade } from "./windConfig";

/** Pressure front, concentric water displacement, tapered vortex and soft radial mist. */
export class WindImpact {
  readonly root = new Group();
  readonly vortex = new WindRibbon(7);
  readonly mist: InstancedMesh;
  private readonly geometry = new PlaneGeometry(26, 26);
  private readonly groundMaterial = windMaterial(
    planeVertex,
    `varying vec2 vUv;uniform float uAge,uDetail,uGrounded;${windNoise}
    void main(){vec2 p=(vUv-0.5)*26.0;float r=length(p);float a=atan(p.y,p.x);
      float front=9.0*(1.0-exp(-uAge*8.0));
      float warp=sin(a*12.0+uAge*8.0)*0.045*uDetail+noise(p*2.0)*0.08;
      float shock=exp(-pow((r-front+warp)/0.09,2.0))*exp(-uAge*3.0);
      float skirt=exp(-pow((r-front*0.97+warp)/0.38,2.0))*exp(-uAge*3.8)*0.22;
      float water=0.0;for(int i=0;i<4;i++){float t=max(0.0,uAge-float(i)*0.11);float radius=11.0*(1.0-exp(-t*1.4));
        water+=exp(-pow((r-radius+warp)/(0.035+float(i)*0.025),2.0))*exp(-t*1.9)*step(float(i)*0.11,uAge)*0.23;}
      float central=exp(-r*r*0.8)*exp(-uAge*10.0)*noise(p*4.0+uAge);
      float fadeIn=smoothstep(0.0,0.035,uAge);float opacity=(shock+skirt+(water+central*0.4)*uGrounded)*fadeIn*(1.0-smoothstep(1.2,2.05,uAge));
      gl_FragColor=vec4(mix(vec3(0.19,0.38,0.45),vec3(0.8,0.91,0.92),shock),opacity);}`,
    { uAge: { value: 0 }, uDetail: { value: 1 }, uGrounded: { value: 1 } },
    true,
  );
  readonly ground = new Mesh(this.geometry, this.groundMaterial);
  private readonly mistGeometry = new PlaneGeometry(1, 1);
  private readonly mistMaterial = windMaterial(
    `attribute float aSeed;varying vec2 vUv;varying float vSeed;uniform float uAge;
    void main(){vUv=uv;vSeed=aSeed;float angle=aSeed*6.28318+uAge*0.3;float radius=0.4+(1.0-exp(-uAge*3.5))*(5.0+aSeed*3.0);
      float column=step(0.7,aSeed);float height=column*(aSeed-0.7)*14.0*(0.3+smoothstep(0.0,0.2,uAge)*0.7);
      radius=mix(radius,0.6+height*0.12,column);
      vec3 center=vec3(cos(angle)*radius,0.45+aSeed*0.65+height,sin(angle)*radius);
      vec4 mv=modelViewMatrix*vec4(center,1.0);mv.xy+=position.xy*vec2(mix(2.1+uAge*1.5,1.5,column),mix(0.7+uAge*0.7,2.0,column));gl_Position=projectionMatrix*mv;}`,
    `varying vec2 vUv;varying float vSeed;uniform float uAge,uDetail;${windNoise}
    void main(){vec2 p=(vUv-0.5)*2.0;float r=dot(p,p);float n=noise(vUv*5.0+vSeed*30.0+vec2(uAge*0.35,0.0));
      float edge=exp(-r*3.0)*(1.0-smoothstep(0.45,1.0,r));float alpha=edge*smoothstep(0.1,0.65,n)*smoothstep(0.0,0.09,uAge)*(1.0-smoothstep(0.2,1.7,uAge))*0.29;
      gl_FragColor=vec4(vec3(0.43,0.61,0.67)+n*0.12,alpha);}`,
    { uAge: { value: 0 }, uDetail: { value: 1 } },
  );
  constructor() {
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0.042;
    this.ground.renderOrder = 2;
    this.root.add(this.ground, this.vortex.mesh);
    this.vortex.material.uniforms.uWidth.value = 0.3;
    this.vortex.material.uniforms.uTurns.value = 2.0;
    const seeds = new Float32Array(18);
    for (let i = 0; i < 18; i++) seeds[i] = (i * 0.61803398875) % 1;
    this.mistGeometry.setAttribute(
      "aSeed",
      new InstancedBufferAttribute(seeds, 1),
    );
    this.mist = new InstancedMesh(this.mistGeometry, this.mistMaterial, 18);
    const identity = new Matrix4();
    for (let i = 0; i < 18; i++) this.mist.setMatrixAt(i, identity);
    this.mist.frustumCulled = false;
    this.mist.renderOrder = 3;
    this.root.add(this.mist);
  }
  setQuality(q: WindQuality): void {
    this.vortex.mesh.count = q.vortex;
    this.vortex.material.uniforms.uDetail.value = q.detail;
    this.mist.count = q.mist;
    this.groundMaterial.uniforms.uDetail.value = q.detail;
  }
  update(age: number, grounded: boolean): void {
    this.root.visible = age >= 0 && age < 2.05;
    if (!this.root.visible) return;
    this.ground.visible = true;
    this.groundMaterial.uniforms.uGrounded.value = grounded ? 1 : 0;
    this.groundMaterial.uniforms.uAge.value = age;
    const strength = fade(0, 0.09, age) * (1 - fade(0.55, 1.45, age));
    this.vortex.update(
      age,
      strength * 0.44,
      5.5 * (0.3 + fade(0, 0.22, age) * 0.7),
      1.25,
      true,
    );
    this.mistMaterial.uniforms.uAge.value = age;
    this.mist.visible = age < 1.7;
  }
  get instanceCount(): number {
    return this.root.visible
      ? (this.vortex.mesh.visible ? this.vortex.mesh.count : 0) +
          (this.mist.visible ? this.mist.count : 0)
      : 0;
  }
  dispose(): void {
    this.geometry.dispose();
    this.groundMaterial.dispose();
    this.mist.dispose();
    this.mistGeometry.dispose();
    this.mistMaterial.dispose();
    this.vortex.dispose();
  }
}
