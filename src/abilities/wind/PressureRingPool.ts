import {
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
} from "three";
import { windMaterial } from "./WindMaterials";

/** Twenty GPU ring slots recycle analytically during flight, independent of frame rate. */
export class PressureRingPool {
  private readonly geometry = new PlaneGeometry(1, 1);
  readonly material = windMaterial(
    `attribute float aSlot;varying vec2 vUv;varying float vAge;uniform float uTime,uCount,uOpacity,uLength;
    void main(){vUv=uv;vAge=fract(uTime*2.2+aSlot/uCount);float radius=0.5+vAge*0.5;
      vec3 p=vec3(position.xy*radius*2.0,-vAge*uLength);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    `varying vec2 vUv;varying float vAge;uniform float uOpacity;
    void main(){float r=length(vUv-0.5)*2.0;float ring=exp(-pow((r-0.76)/0.018,2.0));
    float arcs=pow(max(0.0,0.5+0.5*sin(atan(vUv.y-0.5,vUv.x-0.5)*3.0+vAge*8.0)),2.0);
    gl_FragColor=vec4(vec3(0.41,0.62,0.68),ring*arcs*(1.0-vAge)*uOpacity);}`,
    {
      uTime: { value: 0 },
      uCount: { value: 12 },
      uOpacity: { value: 0 },
      uLength: { value: 5.2 },
    },
    true,
  );
  readonly mesh: InstancedMesh;
  constructor() {
    const slots = new Float32Array(20);
    for (let i = 0; i < 20; i++) slots[i] = i;
    this.geometry.setAttribute("aSlot", new InstancedBufferAttribute(slots, 1));
    this.mesh = new InstancedMesh(this.geometry, this.material, 20);
    const identity = new Matrix4();
    for (let i = 0; i < 20; i++) this.mesh.setMatrixAt(i, identity);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }
  update(time: number, opacity: number, length: number): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uOpacity.value = opacity;
    this.material.uniforms.uCount.value = this.mesh.count;
    this.material.uniforms.uLength.value = length;
    this.mesh.visible = opacity > 0.001;
  }
  dispose(): void {
    this.mesh.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
