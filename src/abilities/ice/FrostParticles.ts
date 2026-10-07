import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial } from 'three';
import type { Group } from 'three';
import { seededRandom } from './iceConfig';

export class FrostParticles {
  readonly points: Points;
  private readonly geometry = new BufferGeometry();
  private readonly material = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uRatio: { value: 1 } },
    vertexShader: `attribute vec3 aVelocity;attribute float aSeed;uniform float uTime,uRatio;varying float vAlpha;
      void main(){float age=max(0.0,uTime-0.56-aSeed*0.34);vec3 p=position;
      p+=aVelocity*age/(1.0+age*0.8);p.y+=sin(age*1.8+aSeed*9.0)*age*0.15-age*age*0.12;
      p.x+=sin(age+aSeed*20.0)*age*0.3;p.y=max(0.06,p.y);
      vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
      gl_PointSize=clamp(28.0*(0.5+aSeed)/max(1.0,-mv.z),1.0,3.8)*uRatio;
      vAlpha=smoothstep(0.0,0.1,age)*(1.0-smoothstep(1.5,3.8,age));}`,
    fragmentShader: `varying float vAlpha;void main(){vec2 p=gl_PointCoord-0.5;float a=exp(-dot(p,p)*20.0)*(1.0-smoothstep(0.35,0.5,length(p)));gl_FragColor=vec4(vec3(0.45,0.85,1.0),a*vAlpha*0.7);}`,
  });
  count = 0;
  constructor(parent: Group, seed: number) {
    const random = seededRandom(seed + 311); const positions: number[] = [], velocities: number[] = [], seeds: number[] = [];
    for (let i = 0; i < 420; i++) {
      const angle = random() * Math.PI * 2, radius = random() * 2;
      positions.push(Math.cos(angle) * radius, random() * 1.5, Math.sin(angle) * radius);
      velocities.push(Math.cos(angle) * (0.5 + random() * 3), 0.5 + random() * 3.5, Math.sin(angle) * (0.5 + random() * 3)); seeds.push(random());
    }
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3)); this.geometry.setAttribute('aVelocity', new Float32BufferAttribute(velocities, 3)); this.geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
    this.points = new Points(this.geometry, this.material); this.points.frustumCulled = false; parent.add(this.points);
  }
  setQuality(count: number, ratio: number): void { this.count = count; this.geometry.setDrawRange(0, count); this.material.uniforms.uRatio.value = ratio; }
  update(time: number): void { this.material.uniforms.uTime.value = time; this.points.visible = time >= 0.55 && time < 4.8; }
  dispose(): void { this.points.removeFromParent(); this.geometry.dispose(); this.material.dispose(); }
}
