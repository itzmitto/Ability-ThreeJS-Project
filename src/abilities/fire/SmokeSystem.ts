import {
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  Mesh,
  PlaneGeometry,
} from "three";
import { fireMaterial, fireNoise } from "./BlackFireMaterials";
/** Three bounded smoke behaviors: violent thrust, rolling fuel smoke, then cooler residual wisps. */
export class SmokeSystem {
  readonly geometry = new InstancedBufferGeometry();
  readonly material = fireMaterial(
    `attribute vec4 aSeed;varying vec2 vUv;varying float vLife,vSeed,vHeat;uniform float uTime;
 void main(){vUv=uv;vSeed=aSeed.z;float t=uTime-.48;float kind=mod(aSeed.w,3.);float cycle=kind<.5?max(0.,t):mod(max(0.,t)+aSeed.z*3.4,3.4);
 float a=aSeed.x*6.283185,r=aSeed.y*4.;float fade=1.-smoothstep(6.8,8.6,uTime);float thrust=kind<.5?cycle*2.8:cycle*(kind<1.5?1.1:.55);
 vec3 p=vec3(cos(a)*r+sin(cycle*.9+a)*cycle*.35,.16+thrust,sin(a)*r+cos(cycle*.7+a)*cycle*.22);
 if(kind>1.5)p.y*=.45;vec4 v=modelViewMatrix*vec4(p,1.);float size=(kind<.5?2.1:2.5)+cycle*.75;
 v.xy+=(uv-.5)*vec2(size,size*.92);gl_Position=projectionMatrix*v;
 float life=kind<.5?(1.-smoothstep(1.2,3.2,cycle)):smoothstep(0.,.4,cycle)*(1.-smoothstep(2.6,3.4,cycle));
 vLife=step(0.,t)*life*fade*(.38+.12*smoothstep(3.7,5.8,uTime));vHeat=exp(-thrust*.42)*(1.-smoothstep(5.1,7.6,uTime));}`,
    `${fireNoise}varying vec2 vUv;varying float vLife,vSeed,vHeat;uniform float uTime,uDetail;
 void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float curl=fbm(p*2.8+vec2(vSeed*91.,-uTime*.32));float mask=pow(max(0.,1.-r*r),2.)*smoothstep(.14,.72,curl);
 vec3 body=mix(vec3(.012,.011,.019),vec3(.054,.046,.061),curl);vec3 under=vec3(.24,.008,.026)*pow(max(0.,1.-vUv.y),3.)*vHeat;
 gl_FragColor=vec4(body+under,mask*vLife*(.8+uDetail*.12));}`,
    { uTime: { value: 0 }, uDetail: { value: 1 } },
  );
  readonly mesh = new Mesh(this.geometry, this.material);
  constructor() {
    const p = new PlaneGeometry(1, 1);
    this.geometry.setAttribute("position", p.getAttribute("position").clone());
    this.geometry.setAttribute("uv", p.getAttribute("uv").clone());
    this.geometry.setIndex(p.index!.clone());
    p.dispose();
    const data = new Float32Array(48 * 4);
    for (let i = 0; i < 48; i++)
      data.set(
        [
          ((i * 137 + 9) % 983) / 983,
          ((i * 73 + 21) % 997) / 997,
          ((i * 193 + 91) % 991) / 991,
          i,
        ],
        i * 4,
      );
    this.geometry.setAttribute("aSeed", new InstancedBufferAttribute(data, 4));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
  }
  update(t: number, count: number, detail: number): void {
    this.geometry.instanceCount = count;
    this.material.uniforms.uTime.value = t;
    this.material.uniforms.uDetail.value = detail;
    this.mesh.visible = t > 0.48 && t < 8.6;
  }
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
