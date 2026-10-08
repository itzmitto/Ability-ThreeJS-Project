import { Mesh, PlaneGeometry, ShaderMaterial, DoubleSide } from "three";
import { pulse } from "./SanguineEclipseConfig";
export class BloodTidalWave {
  readonly material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uPower: { value: 0 },
      uDetail: { value: 1 },
    },
    vertexShader: `uniform float uTime;varying vec2 vPos;varying float vHeight;void main(){vec3 p=position;float age=max(0.0,uTime-10.1),r=length(p.xy),front=min(22.0,age*9.0);float crest=exp(-pow((r-front)/1.5,2.0))*max(0.0,1.0-age/4.5);p.z+=crest*(.7+.15*sin(atan(p.y,p.x)*9.0-uTime))*smoothstep(0.0,.3,age);vPos=p.xy;vHeight=crest;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1);}`,
    fragmentShader: `uniform float uTime;uniform float uPower;uniform float uDetail;varying vec2 vPos;varying float vHeight;
void main(){float r=length(vPos),a=atan(vPos.y,vPos.x),age=max(0.0,uTime-10.1);float streak=pow(max(0.0,sin(a*17.0+r*1.9-uTime*.6+sin(a*5.0)*.8)),6.0);float residue=exp(-r*r/110.0)*(.12+.13*streak)*(1.0-smoothstep(13.2,15.7,uTime));float alpha=(residue+vHeight*.45)*uPower;float micro=sin(vPos.x*7.0+uTime)*cos(vPos.y*6.7-uTime*.73);vec3 color=vec3(.11,.0015,.008)+vec3(.12,.012,.018)*(vHeight+max(0.0,micro)*.13*uDetail);gl_FragColor=vec4(color,alpha*(1.0-smoothstep(23.0,25.0,r)));}`,
  });
  readonly mesh = new Mesh(new PlaneGeometry(52, 52, 96, 96), this.material);
  constructor() {
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.07;
    this.mesh.renderOrder = 3;
  }
  update(t: number, detail: number): void {
    const power = pulse(10.1, 10.3, 15.3, 16, t);
    this.mesh.visible = power > 0.001;
    this.material.uniforms.uTime.value = t;
    this.material.uniforms.uPower.value = power;
    this.material.uniforms.uDetail.value = detail;
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
