import { AdditiveBlending, Mesh, ShaderMaterial } from 'three';
import type { Group, PlaneGeometry } from 'three';

/** Local water illumination overlay, since the existing water uses its own analytical lighting. */
export class ImpactGlow {
  private readonly material = new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uStrength: { value: 1 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec2 vUv;uniform float uTime,uStrength;
      void main(){float r=length((vUv-0.5)*2.0);float flash=smoothstep(0.43,0.58,uTime)*exp(-max(0.0,uTime-0.6)*4.5);
      float linger=(1.0-smoothstep(2.8,4.6,uTime))*smoothstep(0.5,0.9,uTime)*0.045;
      float alpha=exp(-r*r*5.0)*(flash*0.22+linger)*uStrength;
      alpha*=1.0-smoothstep(0.75,1.0,r);gl_FragColor=vec4(vec3(0.04,0.42,0.65),alpha);}`,
  });
  private readonly mesh: Mesh;
  constructor(parent: Group, geometry: PlaneGeometry) { this.mesh = new Mesh(geometry, this.material); this.mesh.rotation.x = -Math.PI / 2; this.mesh.position.y = 0.04; this.mesh.scale.setScalar(15); parent.add(this.mesh); }
  setQuality(detail: number): void { this.material.uniforms.uStrength.value = 0.55 + detail * 0.22; }
  update(time: number): void { this.material.uniforms.uTime.value = time; }
  dispose(): void { this.mesh.removeFromParent(); this.material.dispose(); }
}
