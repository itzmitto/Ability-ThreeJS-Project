import { Mesh, PlaneGeometry, ShaderMaterial, DoubleSide } from "three";
import { pulse } from "./SanguineEclipseConfig";
export class CrimsonTargetField {
  readonly material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uTime: { value: 0 }, uPower: { value: 0 } },
    vertexShader:
      "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1);}",
    fragmentShader: `uniform float uTime;uniform float uPower;varying vec2 vUv;
void main(){vec2 p=(vUv-.5)*2.0;float r=length(p),a=atan(p.y,p.x)+uTime*.13;float edge=exp(-pow((r-.85)/.009,2.0))*(.35+.65*step(.1,sin(a*19.0)));
float inner=exp(-pow((r-.58)/.005,2.0));float runes=exp(-pow((r-(.7+.045*sin(a*12.0)))/.008,2.0))*step(.6,sin(a*24.0));
float streams=pow(max(0.0,sin(a*7.0+r*16.0-uTime*.6)),18.0)*exp(-r*2.8);float shade=exp(-r*r*3.0)*.09;
float alpha=(edge*.55+inner*.3+runes*.45+streams*.2+shade)*uPower*(1.0-smoothstep(.9,1.0,r));gl_FragColor=vec4(mix(vec3(.06,.0006,.004),vec3(.4,.006,.022),edge+runes),alpha);}`,
  });
  readonly mesh = new Mesh(new PlaneGeometry(24, 24), this.material);
  constructor() {
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.06;
    this.mesh.renderOrder = 2;
  }
  update(t: number): void {
    const power = pulse(0.8, 1.7, 13.3, 15.3, t);
    this.mesh.visible = power > 0.001;
    this.material.uniforms.uPower.value = power;
    this.material.uniforms.uTime.value = t;
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
