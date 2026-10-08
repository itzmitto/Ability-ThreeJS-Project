import {
  PlaneGeometry,
  InstancedBufferGeometry,
  InstancedBufferAttribute,
  Mesh,
  ShaderMaterial,
} from "three";
import { LANCE_GLSL } from "./BloodLanceScore";
export class BloodMistSystem {
  readonly material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `uniform float uTime;attribute float aIndex;varying vec2 vUv;varying float vPower;varying float vSeed;${LANCE_GLSL}
float gate(float a,float b,float c,float d,float t){return smoothstep(a,b,t)*(1.0-smoothstep(c,d,t));}
void main(){float id=aIndex,a=id*2.399963+uTime*.06,cat=mod(id,4.0);vec3 c;float size=2.0,power=0.0;
if(cat<.5){power=gate(1.3,2.4,4.7,6.0,uTime);c=vec3(cos(a)*6.0,fract(id*.17+uTime*.12)*7.0,sin(a)*6.0-16.0);size=2.8;}
else if(cat<1.5){float n=mod(id,28.0),age=max(0.0,uTime-launch(n)-.52);power=step(launch(n)+.52,uTime)*(1.0-smoothstep(.8,1.8,age));c=lanceEnd(n)+vec3(cos(a)*age,.6+age*.3,sin(a)*age);size=1.0+age;}
else if(cat<2.5){float age=max(0.0,uTime-10.1);power=gate(10.1,10.4,12.3,13.7,uTime);float r=2.0+age*4.0;c=vec3(cos(a)*r,.7+mod(id,3.0)*.45,sin(a)*r);size=3.0+age*1.1;}
else{power=gate(11.4,12.5,14.8,16.0,uTime);float r=5.0+mod(id,4.0)*2.0;c=vec3(cos(a)*r,.6+sin(a)*.2,sin(a)*r);size=4.0;}
vec4 center=modelViewMatrix*vec4(c,1);center.xy+=position.xy*size;gl_Position=projectionMatrix*center;vUv=uv;vPower=power;vSeed=id;}`,
    fragmentShader: `uniform float uTime;varying vec2 vUv;varying float vPower;varying float vSeed;
void main(){vec2 p=(vUv-.5)*2.0;float r=length(p);float n=.65+.22*sin(p.x*7.0+uTime*.37+vSeed)*sin(p.y*6.2-uTime*.28)+.12*sin(p.x*13.0+p.y*9.0+uTime*.2);float alpha=pow(max(0.0,1.0-r*r),2.0)*n*vPower*.10;gl_FragColor=vec4(vec3(.055,.003,.014),alpha);}`,
  });
  readonly mesh: Mesh;
  constructor() {
    const b = new PlaneGeometry(1, 1),
      g = new InstancedBufferGeometry().copy(
        b as unknown as InstancedBufferGeometry,
      );
    b.dispose();
    g.setAttribute(
      "aIndex",
      new InstancedBufferAttribute(
        Float32Array.from({ length: 36 }, (_, i) => i),
        1,
      ),
    );
    g.instanceCount = 36;
    this.mesh = new Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
  }
  update(t: number, count: number): void {
    this.mesh.visible = t > 1.3 && t < 16;
    this.material.uniforms.uTime.value = t;
    (this.mesh.geometry as InstancedBufferGeometry).instanceCount = count;
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
