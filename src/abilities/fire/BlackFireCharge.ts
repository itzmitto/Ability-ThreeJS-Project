import { Group, Mesh, PlaneGeometry, Quaternion, Vector3 } from "three";
import { fireMaterial, fireNoise, planeVertex } from "./BlackFireMaterials";
export class BlackFireCharge {
  readonly root = new Group();
  readonly geometry = new PlaneGeometry(0.64, 0.82);
  readonly material = fireMaterial(
    planeVertex,
    `${fireNoise}varying vec2 vUv;uniform float uTime;
 void main(){vec2 p=(vUv-.5)*2.;float a=atan(p.y,p.x),r=length(p);float n=fbm(p*4.-vec2(0,uTime*6.));float w=.35+(n-.5)*.22;float mass=1.-smoothstep(w-.04,w+.04,r);
 float rim=exp(-pow((r-w)/.07,2.));float motes=pow(max(0.,cos(a*9.-uTime*12.)),40.)*exp(-pow((r-.66+uTime*.17)/.05,2.));
 float tongue=pow(max(0.,sin(a*3.+r*14.-uTime*9.)),14.)*(1.-smoothstep(.3,.9,r));float fade=smoothstep(0.,.1,uTime)*(1.-smoothstep(.35,.65,uTime));
 vec3 color=vec3(.005,.002,.008)*mass+vec3(.66,.012,.065)*(rim+ tongue*.25)+vec3(1.,.17,.015)*motes;
 gl_FragColor=vec4(color*1.5,(mass*.85+rim*.6+motes+tongue*.22)*fade);}`,
    { uTime: { value: 0 } },
  );
  readonly mesh = new Mesh(this.geometry, this.material);
  constructor() {
    this.root.add(this.mesh);
    this.mesh.renderOrder = 6;
  }
  update(t: number, hand: Vector3, rotation: Quaternion): void {
    this.root.visible = t < 0.65;
    if (!this.root.visible) return;
    this.root.position.copy(hand);
    this.root.quaternion.copy(rotation);
    this.material.uniforms.uTime.value = t;
  }
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
