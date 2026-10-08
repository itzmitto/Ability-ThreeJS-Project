import { BufferGeometry, Float32BufferAttribute, Points } from "three";
import type { ShaderMaterial } from "three";
import { fireMaterial } from "./BlackFireMaterials";
class EmberEmitter {
  readonly geometry = new BufferGeometry();
  readonly material: ShaderMaterial;
  readonly points: Points;
  count = 0;
  constructor(readonly kind: number) {
    const data = new Float32Array(450 * 4);
    for (let i = 0; i < 450; i++)
      data.set(
        [
          ((i * 137 + 9) % 983) / 983,
          ((i * 73 + 21) % 997) / 997,
          ((i * 193 + 91) % 991) / 991,
          ((i * 53 + 17) % 977) / 977,
        ],
        i * 4,
      );
    this.geometry.setAttribute(
      "position",
      new Float32BufferAttribute(new Float32Array(450 * 3), 3),
    );
    this.geometry.setAttribute("aSeed", new Float32BufferAttribute(data, 4));
    this.material = fireMaterial(
      `attribute vec4 aSeed;varying float vAlpha,vHeat;uniform float uTime,uKind,uRatio;
 void main(){float age=uTime-.62,a=aSeed.x*6.283185,r=aSeed.y*4.5;vec3 p=vec3(cos(a)*r,.1,sin(a)*r);float opacity=0.,size=1.5;vHeat=aSeed.z;
 if(uKind<.5){float t=max(0.,age),travel=(1.-exp(-t*2.4))/2.4;p+=vec3(cos(a)*travel*(4.+r),travel*(4.+aSeed.z*8.)-t*t*.8,sin(a)*travel*(4.+r));opacity=step(0.,age)*(1.-smoothstep(.4,2.1,t))*smoothstep(-.2,.1,p.y);size=1.4+aSeed.z*2.;}
 else if(uKind<1.5){float t=mod(max(0.,age)+aSeed.z*3.5,3.5);p+=vec3(sin(t*2.+a)*.6,t*(.7+aSeed.w*1.3),cos(t*1.7+a)*.6);opacity=step(0.,age)*smoothstep(0.,.2,t)*(1.-smoothstep(2.7,3.5,t))*(1.-smoothstep(5.8,8.,uTime));size=1.+aSeed.w*1.5;}
 else if(uKind<2.5){float t=max(0.,age);p+=vec3(sin(t*.8+a)*t*.23,.3+t*(.18+aSeed.w*.35),cos(t*.6+a)*t*.19);opacity=smoothstep(.6,1.6,uTime)*(1.-smoothstep(6.8,8.6,uTime))*.38;size=.8+aSeed.w*.8;}
 else{p.y=.08;opacity=smoothstep(3.7,5.,uTime)*(1.-smoothstep(6.7,8.5,uTime))*(.4+.3*sin(uTime*5.+aSeed.z*29.));size=1.3+aSeed.z;}
 vAlpha=opacity;vec4 v=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=size*uRatio*clamp(22./max(2.,-v.z),.65,2.8);}`,
      `varying float vAlpha,vHeat;uniform float uKind;void main(){vec2 p=gl_PointCoord-.5;float mask=pow(max(0.,1.-dot(p,p)*4.),2.);vec3 color=uKind>1.5&&uKind<2.5?vec3(.26,.18,.24):mix(vec3(.50,.004,.035),vec3(1.,.19,.035),vHeat);gl_FragColor=vec4(color*(uKind<.5?2.:1.2),mask*vAlpha);}`,
      { uTime: { value: 0 }, uKind: { value: kind }, uRatio: { value: 1 } },
      true,
    );
    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
  }
  configure(count: number, ratio: number): void {
    this.count = count;
    this.geometry.setDrawRange(0, count);
    this.material.uniforms.uRatio.value = ratio;
  }
  update(t: number): void {
    this.material.uniforms.uTime.value = t;
    this.points.visible =
      this.kind === 0
        ? t >= 0.62 && t < 2.75
        : this.kind === 3
          ? t > 3.7
          : t >= 0.62;
  }
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
export class EmberSystem {
  readonly emitters = [
    new EmberEmitter(0),
    new EmberEmitter(1),
    new EmberEmitter(2),
    new EmberEmitter(3),
  ];
  get count(): number {
    let n = 0;
    for (const e of this.emitters) if (e.points.visible) n += e.count;
    return n;
  }
  configure(budget: number, ratio: number): void {
    const a = Math.floor(budget * 0.25),
      b = Math.floor(budget * 0.4),
      c = Math.floor(budget * 0.2);
    this.emitters[0].configure(a, ratio);
    this.emitters[1].configure(b, ratio);
    this.emitters[2].configure(c, ratio);
    this.emitters[3].configure(budget - a - b - c, ratio);
  }
  update(t: number): void {
    for (const e of this.emitters) e.update(t);
  }
  dispose(): void {
    for (const e of this.emitters) e.dispose();
  }
}
