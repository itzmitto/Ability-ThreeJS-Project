import { Mesh, PlaneGeometry } from "three";
import { fireMaterial, fireNoise } from "./BlackFireMaterials";
/** Local optical approximation: moving mirage contours plus warping inside flame/smoke/water shaders. */
export class HeatDistortion {
  readonly geometry = new PlaneGeometry(12, 5, 8, 20);
  readonly material = fireMaterial(
    `varying vec2 vUv;uniform float uTime;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(vec3(0,2.1,0),1.);vec2 bend=position.xy;bend.x+=sin(uv.y*22.-uTime*9.)*.12*uv.y;p.xy+=bend;gl_Position=projectionMatrix*p;}`,
    `${fireNoise}varying vec2 vUv;uniform float uTime,uDetail;void main(){vec2 p=(vUv-.5)*2.;float mask=pow(max(0.,1.-dot(p,p)),2.);float n=fbm(vUv*vec2(9.,13.)-vec2(0,uTime*.8));float contours=pow(max(0.,cos(n*38.-uTime*2.)),18.);float life=smoothstep(.6,1.1,uTime)*(1.-smoothstep(6.5,8.,uTime));gl_FragColor=vec4(mix(vec3(.025,.05,.09),vec3(.16,.015,.045),n),mask*contours*life*uDetail*.045);}`,
    { uTime: { value: 0 }, uDetail: { value: 1 } },
  );
  readonly mesh = new Mesh(this.geometry, this.material);
  constructor() {
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
  }
  update(t: number, detail: number): void {
    this.material.uniforms.uTime.value = t;
    this.material.uniforms.uDetail.value = detail;
    this.mesh.visible = detail > 0 && t > 0.6 && t < 8;
  }
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
