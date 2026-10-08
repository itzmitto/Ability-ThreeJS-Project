import { SphereGeometry, Mesh, ShaderMaterial, DoubleSide } from "three";
import { pulse } from "./SanguineEclipseConfig";
export class CrimsonImpact {
  readonly material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uTime: { value: 0 }, uAge: { value: 0 }, uPower: { value: 0 } },
    vertexShader: `uniform float uAge;uniform float uTime;varying vec3 vPos;varying vec3 vWorld;void main(){vec3 p=position*(1.0+sin(position.y*16.0+position.x*9.0-uAge*8.0)*.035);p.y*=.55;vPos=position;vec4 w=modelMatrix*vec4(p,1);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float uAge;uniform float uPower;varying vec3 vPos;varying vec3 vWorld;void main(){float holes=sin(vPos.x*13.0+uAge*7.0)*sin(vPos.z*17.0-uAge*4.0)+sin(vPos.y*21.0);if(holes<uAge-.1)discard;vec3 n=normalize(vPos);float rim=pow(1.0-abs(dot(n,normalize(cameraPosition-vWorld))),2.0);float alpha=(.025+.28*rim)*uPower;gl_FragColor=vec4(vec3(.25,.004,.018)+vec3(.12,.02,.025)*rim,alpha);}`,
  });
  readonly mesh = new Mesh(
    new SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    this.material,
  );
  update(t: number): void {
    const age = Math.max(0, t - 10.1),
      power = pulse(10.1, 10.2, 10.8, 11.5, t);
    this.mesh.visible = power > 0.001;
    this.mesh.scale.setScalar(0.3 + Math.min(18, Math.pow(age, 0.65) * 18));
    this.material.uniforms.uAge.value = age;
    this.material.uniforms.uPower.value = power;
    this.material.uniforms.uTime.value = t;
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
