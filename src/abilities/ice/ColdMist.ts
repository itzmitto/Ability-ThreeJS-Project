import { InstancedBufferAttribute, InstancedMesh, Object3D, PlaneGeometry, ShaderMaterial } from 'three';
import type { Group } from 'three';
import { seededRandom, smooth } from './iceConfig';

export class ColdMist {
  readonly mesh: InstancedMesh;
  private readonly material = new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `attribute float aSeed; varying vec2 vUv;varying float vSeed;uniform float uTime;
      void main(){vUv=uv;vSeed=aSeed;vec4 p=modelViewMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
      p.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));gl_Position=projectionMatrix*p;}`,
    fragmentShader: `varying vec2 vUv;varying float vSeed;uniform float uTime;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
      void main(){vec2 p=(vUv-0.5)*2.0;float r=dot(p,p);float age=uTime-0.55-vSeed*0.18;
      float cloud=(noise(vUv*4.0+vSeed*16.0+vec2(age*0.1,0))+noise(vUv*8.0-vSeed*9.0))*0.5;
      float alpha=exp(-r*3.2)*smoothstep(0.0,0.15,age)*(1.0-smoothstep(0.4,2.6,age));
      alpha*=smoothstep(0.05,0.65,cloud)*0.32*(1.0-smoothstep(0.4,1.0,r));
      gl_FragColor=vec4(vec3(0.56,0.76,0.87),alpha);}`,
  });
  private readonly geometry = new PlaneGeometry(1, 1);
  private readonly transform = new Object3D();
  private readonly data: { angle: number; seed: number; size: number }[] = [];
  constructor(parent: Group, seed: number) {
    const random = seededRandom(seed + 223); const seeds = new Float32Array(20);
    for (let i = 0; i < 20; i++) { seeds[i] = random(); this.data.push({ angle: random() * Math.PI * 2, seed: seeds[i], size: 2 + random() * 2 }); }
    this.geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
    this.mesh = new InstancedMesh(this.geometry, this.material, 20); this.mesh.frustumCulled = false; this.mesh.renderOrder = 3; parent.add(this.mesh);
  }
  setQuality(count: number): void { this.mesh.count = count; }
  update(time: number): void {
    this.material.uniforms.uTime.value = time; this.mesh.visible = time >= 0.55 && time < 3.4;
    if (!this.mesh.visible) return;
    for (let i = 0; i < this.mesh.count; i++) {
      const cloud = this.data[i]; const age = Math.max(0, time - 0.55 - cloud.seed * 0.18);
      const distance = 0.7 + smooth(0, 1.2, age) * (2.0 + cloud.seed * 2.5);
      this.transform.position.set(Math.cos(cloud.angle) * distance, 0.35 + cloud.seed * 0.38 + age * 0.10, Math.sin(cloud.angle) * distance);
      this.transform.scale.set(cloud.size * (1 + age * 0.4), 0.7 + age * 0.32, 1); this.transform.updateMatrix(); this.mesh.setMatrixAt(i, this.transform.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  dispose(): void { this.mesh.removeFromParent(); this.mesh.dispose(); this.geometry.dispose(); this.material.dispose(); }
}
