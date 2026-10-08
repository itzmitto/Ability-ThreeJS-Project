import { Mesh, PlaneGeometry, Vector3, NormalBlending } from "three";
import {
  fireMaterial,
  fireNoise,
  planeVertex,
  burnShader,
} from "./BlackFireMaterials";
/** Temporary charcoal kindling, ember fissures, boiling shimmer and ragged fire reflection. */
export class ScorchResidue {
  readonly geometry = new PlaneGeometry(26, 26);
  readonly view = new Vector3();
  readonly material = fireMaterial(
    planeVertex,
    `${fireNoise}${burnShader}varying vec2 vUv;uniform float uTime,uDetail,uLayer;uniform vec3 uView;
 void main(){vec2 p=(vUv-.5)*26.;p.y=-p.y;float r=length(p),t=uTime;float warp=uDetail*.06*sin(p.y*4.+t*9.)*noise(p*3.);vec2 q=p+warp;
 float n=fbm(q*1.25);float veins=pow(max(0.,1.-abs(n-.49)*24.),4.);
 float burnPatch=(1.-smoothstep(3.8,5.5+noise(q)*.5,r));float kindle=smoothstep(.29,.6,t);float fuel=burn(t,r);
 float residue=1.-smoothstep(6.3,8.5,t);float pulse=.66+.18*sin(t*8.+p.x*3.)+.16*noise(q*3.-t);
 float hot=veins*burnPatch*(.13+fuel*.48)*pulse*residue;
 float flare=exp(-max(0.,t-.62)*6.)*step(.62,t);float leading=exp(-pow((r-(t-.62)*9.)/.1,2.))*flare*.12;
 vec2 direction=normalize(uView.xz+vec2(.00001));float along=dot(p,direction),across=dot(p,vec2(-direction.y,direction.x));
 float reflection=exp(-across*across/(1.8+max(0.,along)*.15))*smoothstep(-1.,1.,along)*(1.-smoothstep(7.,12.,along));
 reflection*=pow(noise(vec2(across*1.8,along*15.+warp+t*.4)),3.)*(.10+fuel*1.2+flare*1.3)*residue;
 vec3 glow=vec3(.78,.008,.025)*(hot+reflection)+vec3(.22,.004,.16)*leading;
 float ash=burnPatch*residue*.16;
 if(uLayer<.5)gl_FragColor=vec4(vec3(.005,.003,.008),ash*kindle);
 else gl_FragColor=vec4(glow*2.8,kindle*(hot+reflection+leading)*(1.-smoothstep(11.,12.8,r)));}`,
    {
      uTime: { value: 0 },
      uDetail: { value: 1 },
      uView: { value: this.view },
      uLayer: { value: 1 },
    },
    true,
  );
  readonly mesh = new Mesh(this.geometry, this.material);
  readonly darkMaterial = this.material.clone();
  readonly dark = new Mesh(this.geometry, this.darkMaterial);
  constructor() {
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.052;
    this.mesh.renderOrder = 2;
    this.dark.rotation.x = -Math.PI / 2;
    this.dark.position.y = 0.045;
    this.dark.renderOrder = 1;
    this.darkMaterial.blending = NormalBlending;
    this.darkMaterial.uniforms.uLayer.value = 0;
  }
  update(t: number, detail: number, view: Vector3): void {
    this.material.uniforms.uTime.value = t;
    this.darkMaterial.uniforms.uTime.value = t;
    this.material.uniforms.uDetail.value = detail;
    this.view.copy(view);
    this.mesh.visible = t > 0.28;
    this.dark.visible = this.mesh.visible;
  }
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.darkMaterial.dispose();
  }
}
