import { Group, IcosahedronGeometry, Mesh, Vector3 } from "three";
import type { Player } from "../../player/Player";
import { bloodMaterial, updateBlood } from "./BloodMaterialSystem";
import { fluidTube } from "./BloodFluidGeometry";
export class BloodCastingAura {
  readonly root = new Group();
  private readonly hand = new Vector3();
  readonly core = new Mesh(new IcosahedronGeometry(0.095, 2), bloodMaterial());
  readonly ribbonMaterial = bloodMaterial(
    `uniform float uTime;varying vec3 vLocal;varying vec3 vWorld;varying vec3 vNormal;void main(){float u=position.x;float a=u*12.0+uTime*3.0;vec3 n=vec3(cos(a)*position.y,position.z,sin(a)*position.y);vec3 p=vec3(cos(a)*(.12+u*.08),u*.4-.2,sin(a)*(.12+u*.08))+n*.011;vLocal=p;vNormal=mat3(modelMatrix)*n;vec4 w=modelMatrix*vec4(p,1);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  );
  readonly ribbon = new Mesh(fluidTube(48, 6), this.ribbonMaterial);
  constructor() {
    this.root.add(this.core, this.ribbon);
  }
  update(
    t: number,
    power: number,
    player: Player,
    parent: Group,
    detail: number,
  ): void {
    this.root.visible = power > 0.001;
    player.visual.getRightHandWorldPosition(this.hand);
    parent.updateWorldMatrix(true, false);
    parent.worldToLocal(this.hand);
    this.root.position.copy(this.hand);
    this.root.scale.setScalar(Math.max(0.001, power));
    this.core.scale.set(
      1 + Math.sin(t * 5) * 0.12,
      1 + Math.cos(t * 3) * 0.15,
      1,
    );
    updateBlood(this.core.material, t, detail, 0.6);
    updateBlood(this.ribbonMaterial, t, detail, 0.2);
  }
  dispose(): void {
    this.core.geometry.dispose();
    this.core.material.dispose();
    this.ribbon.geometry.dispose();
    this.ribbonMaterial.dispose();
  }
}
