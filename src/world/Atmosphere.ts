import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial } from 'three';
import type { Scene, Vector3 } from 'three';
import type { GraphicsSettings } from '../quality/GraphicsSettings';

export class Atmosphere {
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  count = 0;
  private unsubscribe: () => void;
  constructor(scene: Scene, quality: GraphicsSettings) {
    const positions = new Float32Array(650 * 3);
    const seeds = new Float32Array(650);
    // Deterministic scattering, independent of the selected preset.
    let seed = 731;
    const random = (): number => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < seeds.length; i++) {
      positions[i * 3] = (random() - 0.5) * 160;
      positions[i * 3 + 1] = random() * 65 + 0.4;
      positions[i * 3 + 2] = (random() - 0.5) * 160;
      seeds[i] = random();
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    const material = new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uRatio: { value: 1 } },
      vertexShader: `uniform float uTime,uRatio;attribute float aSeed;varying float vFade;
        void main(){vec3 p=position;p.x+=sin(uTime*0.055+aSeed*30.0)*1.2;p.y+=sin(uTime*0.1+aSeed*20.0)*0.6;
        vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp((aSeed*0.7+0.65)*70.0/max(-mv.z,1.0),0.8,2.8)*uRatio;
        vFade=(0.28+0.2*sin(uTime*0.3+aSeed*40.0))*(1.0-smoothstep(15.0,100.0,-mv.z));}`,
      fragmentShader: `varying float vFade;void main(){float d=length(gl_PointCoord-0.5);float a=1.0-smoothstep(0.1,0.5,d);gl_FragColor=vec4(vec3(0.23,0.38,0.58),a*vFade);}`,
    });
    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.unsubscribe = quality.subscribe(config => {
      this.count = config.particles;
      geometry.setDrawRange(0, this.count);
      material.uniforms.uRatio.value = Math.min(window.devicePixelRatio || 1, config.pixelRatio);
    });
  }
  update(time: number, position: Vector3): void {
    this.points.material.uniforms.uTime.value = time;
    this.points.position.x = position.x;
    this.points.position.z = position.z;
  }
  dispose(): void { this.unsubscribe(); this.points.geometry.dispose(); this.points.material.dispose(); this.points.removeFromParent(); }
}
