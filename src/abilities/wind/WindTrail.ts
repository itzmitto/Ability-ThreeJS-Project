import {
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
} from "three";
import { windMaterial, windNoise } from "./WindMaterials";

/** Crossed, noise-masked sheets make a soft volume; a finite six-metre tail dissipates after arrival. */
export class WindTrail {
  private readonly geometry = new PlaneGeometry(1, 1, 1, 32);
  private readonly material = windMaterial(
    `attribute float aAngle;varying vec2 vUv;varying float vAngle;uniform float uTime,uLength;
    void main(){vUv=uv;vAngle=aAngle;float t=uv.y;float angle=aAngle+uTime*0.8+t*2.0;
      float width=0.35+sin(t*3.14159)*0.7;float x=position.x*width;
      vec3 p=vec3(cos(angle)*x,sin(angle)*x,-t*uLength);
      p.xy+=vec2(sin(t*14.0+uTime*5.0+aAngle),cos(t*11.0-uTime*4.0+aAngle))*t*0.09;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    `varying vec2 vUv;varying float vAngle;uniform float uTime,uOpacity,uDetail;${windNoise}
      void main(){vec2 p=vUv;float bend=sin(p.y*17.0-uTime*4.0+vAngle)*0.06*uDetail;
        float n=noise(vec2((p.x+bend)*7.0,p.y*15.0-uTime*6.0)+vAngle);
        float edge=pow(max(0.0,1.0-abs(p.x*2.0-1.0)),2.0);
        float filaments=pow(max(0.0,sin((p.x+bend)*23.0+p.y*6.0+vAngle)),8.0);
        float opacity=edge*sin(p.y*3.14159)*(n*0.3+filaments*0.4)*uOpacity;
        gl_FragColor=vec4(mix(vec3(0.2,0.39,0.48),vec3(0.6,0.75,0.79),n),opacity);}`,
    {
      uTime: { value: 0 },
      uLength: { value: 6 },
      uOpacity: { value: 0 },
      uDetail: { value: 1 },
    },
  );
  readonly mesh: InstancedMesh;
  constructor() {
    this.geometry.setAttribute(
      "aAngle",
      new InstancedBufferAttribute(
        new Float32Array([0, Math.PI / 3, (Math.PI * 2) / 3]),
        1,
      ),
    );
    this.mesh = new InstancedMesh(this.geometry, this.material, 3);
    const identity = new Matrix4();
    for (let i = 0; i < 3; i++) this.mesh.setMatrixAt(i, identity);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }
  update(time: number, opacity: number, length: number, detail: number): void {
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uOpacity.value = opacity;
    u.uLength.value = Math.min(6, length);
    u.uDetail.value = detail;
    this.mesh.count = detail === 0 ? 1 : 3;
    this.mesh.visible = opacity > 0.001;
  }
  dispose(): void {
    this.mesh.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
