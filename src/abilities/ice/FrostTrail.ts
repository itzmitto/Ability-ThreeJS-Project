import { AdditiveBlending, Mesh, ShaderMaterial, Vector3 } from 'three';
import type { Group, PlaneGeometry } from 'three';
import type { Player } from '../../player/Player';

/** A thin travelling ground front plus restrained frost at the animated right hand. */
export class FrostTrail {
  private readonly material = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec2 vUv;uniform float uTime;
      void main(){float front=clamp((uTime-0.08)/0.36,0.0,1.0);float x=vUv.x;
      float alive=smoothstep(x,x+0.08,front)*(1.0-smoothstep(0.35,0.9,uTime));
      float line=exp(-abs(vUv.y-0.5)*22.0);
      float veins=pow(0.5+0.5*sin(x*180.0+vUv.y*22.0),8.0)*exp(-abs(vUv.y-0.5)*8.0);
      float head=exp(-pow((x-front)*32.0,2.0))*0.8;
      gl_FragColor=vec4(vec3(0.18,0.65,0.86),(line+veins*0.3+head)*alive*0.5);}`,
  });
  private readonly mesh: Mesh;
  private readonly handMaterial = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv;uniform float uTime;void main(){float r=length(vUv-0.5);float a=exp(-r*r*38.0)*(1.0-smoothstep(0.1,0.4,uTime));gl_FragColor=vec4(vec3(0.35,0.8,1.0),a*0.55);}',
  });
  private readonly hand: Mesh;
  private readonly position = new Vector3();
  constructor(parent: Group, geometry: PlaneGeometry, private readonly player: Player, target: Vector3) {
    const origin = player.position;
    const dx = target.x - origin.x, dz = target.z - origin.z;
    this.mesh = new Mesh(geometry, this.material); this.mesh.rotation.set(-Math.PI / 2, 0, -Math.atan2(dz, dx));
    this.mesh.position.set((origin.x - target.x) / 2, 0.065, (origin.z - target.z) / 2);
    this.mesh.scale.set(Math.max(0.01, Math.hypot(dx, dz)), 0.65, 1); parent.add(this.mesh);
    this.hand = new Mesh(geometry, this.handMaterial); this.hand.scale.setScalar(0.36); parent.add(this.hand);
  }
  update(time: number, cameraQuaternion: import('three').Quaternion, target: Vector3): void {
    this.material.uniforms.uTime.value = time; this.mesh.visible = time >= 0.08 && time < 0.95;
    this.handMaterial.uniforms.uTime.value = time; this.hand.visible = time < 0.4;
    if (this.hand.visible) { this.player.visual.getRightHandWorldPosition(this.position); this.hand.position.copy(this.position).sub(target); this.hand.quaternion.copy(cameraQuaternion); }
  }
  dispose(): void { this.mesh.removeFromParent(); this.hand.removeFromParent(); this.material.dispose(); this.handMaterial.dispose(); }
}
