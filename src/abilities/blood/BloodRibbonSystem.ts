import {
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  Mesh,
  ShaderMaterial,
} from "three";
import { fluidTube } from "./BloodFluidGeometry";
import { bloodMaterial, updateBlood } from "./BloodMaterialSystem";
/** Cohesive volumetric stream paths. No per-frame curve/geometry reconstruction. */
export class BloodRibbonSystem {
  readonly material: ShaderMaterial;
  readonly mesh: Mesh;
  constructor(readonly mode: 0 | 1 | 2 | 3) {
    const base = fluidTube(56, 10),
      g = new InstancedBufferGeometry().copy(base as InstancedBufferGeometry);
    base.dispose();
    g.setAttribute(
      "aIndex",
      new InstancedBufferAttribute(
        Float32Array.from({ length: 28 }, (_, i) => i),
        1,
      ),
    );
    g.instanceCount = 28;
    this.material =
      bloodMaterial(`uniform float uTime;uniform float uPower;uniform float uMode;uniform float uCompression;attribute float aIndex;varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;
vec3 path(float u){float id=aIndex,a=id*2.399963+uTime*(.11+mod(id,3.0)*.023);float radius=6.0+sin(id*3.2)*1.2;vec3 c;
 if(uMode<.5){float theta=a+u*1.5-uTime*.12;c=vec3(cos(theta)*radius*(1.0-u*.75),u*12.5,sin(theta)*radius*(1.0-u*.75)-16.0);}
 else if(uMode<1.5){float theta=a+u*5.45+uTime*(.13+mod(id,3.0)*.06);float r=(7.0+sin(id)*1.4)*(1.0-uCompression*.55);c=vec3(cos(theta)*r,(sin(theta)*sin(id*.71)*4.8+cos(id)*1.1)*(1.0-uCompression*.5)+12.5,sin(theta)*r*cos(id*.31)-16.0);}
 else if(uMode<2.5){float theta=a+u*8.0-uTime*.5;float r=(.7+u*.7)*(1.0-u*.4);c=vec3(cos(theta)*r,(1.0-u)*12.5,sin(theta)*r*cos(id*.31)-16.0*(1.0-u));}
 else{float theta=a+u*1.8;float age=max(0.0,uTime-10.1);float r=2.0+u*15.0*(1.0-exp(-age*5.0));c=vec3(cos(theta)*r,sin(u*3.14159)*(1.0-exp(-age*8.0))*max(0.0,5.0-age*1.4)+.12,sin(theta)*r);}
 return c;}
void main(){float u=position.x;vec3 c=path(u),next=path(min(1.001,u+.002));vec3 tangent=normalize(next-c);vec3 side=normalize(cross(tangent,vec3(.01,1.0,.03))),up=cross(side,tangent);
float radius=(uMode<.5?.32:uMode<1.5?.26:uMode<2.5?.22:.36)*( .45+.55*pow(sin(u*3.14159),.6))*(1.0+.25*sin(u*26.0-uTime*1.9+aIndex))*uPower;
 vec3 normal=side*position.y+up*position.z;vec3 p=c+normal*radius;vLocal=p;vNormal=mat3(modelMatrix)*normal;vec4 world=modelMatrix*vec4(p,1);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`);
    Object.assign(this.material.uniforms, {
      uPower: { value: 0 },
      uMode: { value: mode },
      uCompression: { value: 0 },
    });
    this.mesh = new Mesh(g, this.material);
    this.mesh.frustumCulled = false;
  }
  update(
    t: number,
    power: number,
    count: number,
    detail: number,
    compression = 0,
  ): void {
    this.mesh.visible = power > 0.003;
    (this.mesh.geometry as InstancedBufferGeometry).instanceCount = count;
    this.material.uniforms.uPower.value = power;
    this.material.uniforms.uCompression.value = compression;
    updateBlood(this.material, t, detail, modeGlow(this.mode));
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
function modeGlow(mode: number): number {
  return mode === 2 ? 0.5 : 0.1;
}
