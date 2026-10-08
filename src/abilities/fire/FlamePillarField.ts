import {
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  Mesh,
  PlaneGeometry,
  AdditiveBlending,
} from "three";
import type { FireQuality } from "./AbyssalFlameConfig";
import { fireMaterial, fireNoise, burnShader } from "./BlackFireMaterials";
const TIMES = [0.8, 0.94, 1.08, 1.16, 0.88, 1.27, 1.02, 1.34, 1.21];
/** Curved, subdivided radial strips form intersecting 3D tongues; a shared clock preserves each fuel pocket. */
export class FlamePillarField {
  readonly geometry = new InstancedBufferGeometry();
  private readonly offsets = new Float32Array(200 * 3);
  private readonly data = new Float32Array(200 * 4);
  private readonly offsetAttribute = new InstancedBufferAttribute(
    this.offsets,
    3,
  );
  private readonly dataAttribute = new InstancedBufferAttribute(this.data, 4);
  readonly material = fireMaterial(
    `${burnShader}attribute vec3 aOffset;attribute vec4 aData;varying vec2 vUv;varying float vSeed,vLife,vHot;uniform float uTime;
 void main(){vUv=uv;vSeed=aData.w;float age=uTime-aData.y;float ignition=smoothstep(0.,.13,age);float fuel=burn(uTime,length(aOffset.xz));
 float eruption=aData.z<1.5?exp(-max(0.,age-.16)*2.8):0.;float linger=aData.z<.5?.36:(aData.z<1.5?.42:1.);
 float height=aData.x*(linger+eruption*.82)*ignition*pow(max(0.,fuel),.68);
 float flicker=(sin(uTime*8.+vSeed*31.)*.09+sin(uTime*13.+vSeed*17.)*.035)*fuel;
 float relapse=exp(-pow((uTime-6.25-vSeed*.7)/.10,2.))*.14*fuel;
 height*=1.+flicker+relapse;float width=aData.z<.5?4.0:(aData.z<1.5?2.2:1.05);float angle=vSeed*6.283185;
 float sway=(sin(uv.y*5.-uTime*3.7+vSeed*23.)*.22+sin(uv.y*13.-uTime*7.+vSeed*13.)*.08)*uv.y*uv.y;
 float tongue=.74+.26*(.5+.5*sin(uv.x*11.+vSeed*20.+uTime*2.));
 vec3 p=vec3((uv.x-.5)*width*(1.-uv.y*.18)+sway*2.,pow(uv.y,.92)*height*tongue, sin(uv.y*8.-uTime*4.+vSeed*29.)*.28*uv.y);
 p.xz=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p.xz;p+=aOffset;p.y+=.04;
 vLife=ignition*fuel;vHot=eruption;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    `${fireNoise}varying vec2 vUv;varying float vSeed,vLife,vHot;uniform float uTime,uLayer,uDetail,uLayers;
 void main(){vec2 p=vec2(vUv.x*4.+vSeed*17.,vUv.y*5.-uTime*3.8);float flow=fbm(p+vec2(sin(vUv.y*7.-uTime*4.)*.4,0));
 float x=abs(vUv.x*2.-1.);float boundary=(1.-vUv.y)*.69+.12+(flow-.5)*.45;
 float d=boundary-x;float aa=max(.018,fwidth(d));float mask=smoothstep(-aa,aa,d)*(1.-smoothstep(.87,1.,vUv.y));
 float breakup=smoothstep(.18+vUv.y*.20+smoothstep(4.5,7.5,uTime)*.09,.5,flow);mask*=mix(1.,breakup,smoothstep(.20,.70,vUv.y));
 float rim=exp(-abs(d)*13.);float vein=smoothstep(.52,.79,flow)*pow(max(0.,1.-vUv.y),1.3)*.5;
 float base=exp(-vUv.y*12.)*pow(max(0.,flow-.40),3.)*6.;
 vec3 dark=mix(vec3(.006,.004,.009),vec3(.035,.011,.022),flow);
 vec3 red=mix(vec3(.18,.001,.006),vec3(.75,.012,.007),flow);vec3 violet=vec3(.12,.006,.13);
 vec3 glow=red*(rim*.7+vein*.5)+violet*rim*.08+vec3(1.,.24,.025)*base*(.08+vHot*.16);
 float dying=smoothstep(.0,.5,vLife);float opacity=mask*dying;
 if(uLayer>.5)gl_FragColor=vec4(glow*(.9+uDetail*.12),opacity*1.1/uLayers);
 else gl_FragColor=vec4(dark+red*vein*.035,opacity*.88);}`,
    {
      uTime: { value: 0 },
      uLayer: { value: 0 },
      uDetail: { value: 1 },
      uLayers: { value: 3 },
    },
  );
  readonly edgeMaterial = this.material.clone();
  readonly body = new Mesh(this.geometry, this.material);
  readonly edges = new Mesh(this.geometry, this.edgeMaterial);
  constructor() {
    const source = new PlaneGeometry(1, 1, 4, 20);
    this.geometry.setAttribute(
      "position",
      source.getAttribute("position").clone(),
    );
    this.geometry.setAttribute("uv", source.getAttribute("uv").clone());
    this.geometry.setIndex(source.index!.clone());
    source.dispose();
    this.geometry.setAttribute("aOffset", this.offsetAttribute);
    this.geometry.setAttribute("aData", this.dataAttribute);
    this.edgeMaterial.uniforms.uLayer.value = 1;
    // Same geometry, different blending: real dark occlusion beneath a restrained emissive edge layer.
    this.edgeMaterial.blending = AdditiveBlending;
    this.body.frustumCulled = this.edges.frustumCulled = false;
    this.body.renderOrder = 4;
    this.edges.renderOrder = 5;
  }
  configure(q: FireQuality, seed: number): void {
    let i = 0;
    const angle = ((seed % 997) / 997) * 6.283185;
    const add = (
      x: number,
      z: number,
      h: number,
      start: number,
      role: number,
      id: number,
    ): void => {
      for (let l = 0; l < q.layers; l++) {
        this.offsets.set([x, 0, z], i * 3);
        this.data.set([h, start, role, (l / q.layers + id * 0.173) % 1], i * 4);
        i++;
      }
    };
    add(0, 0, 8, 0.62, 0, 0);
    for (let j = 0; j < q.secondary; j++) {
      const a = angle + j * 2.399963,
        r = 1.7 + (j % 3) * 0.66;
      add(
        Math.cos(a) * r,
        Math.sin(a) * r,
        4.3 + (j % 4) * 0.65,
        TIMES[j],
        1,
        j + 1,
      );
    }
    for (let j = 0; j < q.pockets; j++) {
      const a = angle + j * 2.399963,
        r = Math.sqrt((j + 0.5) / q.pockets) * 4.7;
      add(
        Math.cos(a) * r,
        Math.sin(a) * r,
        1.05 + (j % 5) * 0.22,
        0.75 + (j % 7) * 0.06,
        2,
        j + 20,
      );
    }
    this.geometry.instanceCount = i;
    this.material.uniforms.uLayers.value =
      this.edgeMaterial.uniforms.uLayers.value = q.layers;
    this.offsetAttribute.needsUpdate = this.dataAttribute.needsUpdate = true;
    this.material.uniforms.uDetail.value =
      this.edgeMaterial.uniforms.uDetail.value = q.detail;
  }
  update(age: number): void {
    this.material.uniforms.uTime.value =
      this.edgeMaterial.uniforms.uTime.value = age;
    this.body.visible = this.edges.visible = age > 0.6 && age < 7.7;
  }
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.edgeMaterial.dispose();
  }
}
