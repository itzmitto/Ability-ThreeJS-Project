import {
  BufferGeometry,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
} from "three";
import { windMaterial, windNoise } from "./WindMaterials";

/** Continuous curved strips, animated in the vertex shader; no per-frame geometry rebuild. Local +Z is the flight axis. */
export class WindRibbon {
  readonly mesh: InstancedMesh;
  readonly material = windMaterial(
    `
    attribute float aPhase; varying vec2 vUv; varying float vPhase;
    uniform float uTime,uLength,uRadius,uWidth,uTurns,uColumn;
    void main(){vUv=uv;vPhase=aPhase;float t=uv.x;
      float angle=aPhase+uTime*(7.5+sin(aPhase)*0.7)+t*uTurns*6.28318+sin(t*8.0+uTime*2.0+aPhase)*0.18;
      float radius=uRadius*(0.85+0.15*sin(aPhase*7.0))*(uColumn>0.5 ? (1.0-t*0.72) : (0.35+sin(t*3.14159)*0.65));
      radius+=sin(t*19.0+uTime*6.0+aPhase)*0.045;
      float width=uWidth*(0.2+sin(t*3.14159)*0.8)*(uv.y-0.5);
      vec3 p=vec3(cos(angle)*(radius+width),sin(angle)*(radius+width),-uLength*t);
      if(uColumn>0.5) p=vec3(cos(angle)*(radius+width)+sin(t*4.0+uTime*3.0)*t*0.3,t*uLength,sin(angle)*(radius+width));
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
    }`,
    `varying vec2 vUv;varying float vPhase;uniform float uTime,uOpacity,uDetail;${windNoise}
    void main(){float edge=pow(max(0.0,1.0-abs(vUv.y*2.0-1.0)),1.8);
      float taper=sin(vUv.x*3.14159);float wisp=0.62+0.38*sin(vUv.x*34.0-uTime*9.0+vPhase);
      float distortion=noise(vec2(vUv.x*14.0-uTime*2.0,vPhase+vUv.y*3.0));
      float alpha=edge*taper*wisp*uOpacity*(0.65+distortion*0.35);
      vec3 color=mix(vec3(0.24,0.43,0.52),vec3(0.76,0.89,0.91),distortion+uDetail*0.08);
      gl_FragColor=vec4(color,alpha);}`,
    {
      uTime: { value: 0 },
      uLength: { value: 4 },
      uRadius: { value: 0.5 },
      uWidth: { value: 0.2 },
      uTurns: { value: 1.8 },
      uColumn: { value: 0 },
      uOpacity: { value: 0 },
      uDetail: { value: 1 },
    },
  );
  private readonly geometry = new BufferGeometry();
  constructor(capacity = 7) {
    const positions: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    const segments = 96;
    for (let i = 0; i <= segments; i++) {
      positions.push(0, 0, 0, 0, 0, 0);
      uv.push(i / segments, 0, i / segments, 1);
      if (i < segments) {
        const j = i * 2;
        indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
      }
    }
    this.geometry.setAttribute(
      "position",
      new Float32BufferAttribute(positions, 3),
    );
    this.geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    this.geometry.setIndex(indices);
    const phases = new Float32Array(capacity);
    for (let i = 0; i < capacity; i++) phases[i] = i * 2.399963;
    this.geometry.setAttribute(
      "aPhase",
      new InstancedBufferAttribute(phases, 1),
    );
    this.mesh = new InstancedMesh(this.geometry, this.material, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    const identity = new Matrix4();
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, identity);
  }
  update(
    time: number,
    opacity: number,
    length: number,
    radius: number,
    column = false,
  ): void {
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uOpacity.value = opacity;
    u.uLength.value = length;
    u.uRadius.value = radius;
    u.uColumn.value = column ? 1 : 0;
    this.mesh.visible = opacity > 0.001;
  }
  dispose(): void {
    this.mesh.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
