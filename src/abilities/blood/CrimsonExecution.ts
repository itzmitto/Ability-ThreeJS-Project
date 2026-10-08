import { Mesh } from "three";
import { liquidLanceGeometry } from "./BloodFluidGeometry";
import { bloodMaterial, updateBlood } from "./BloodMaterialSystem";
import { smooth } from "./SanguineEclipseConfig";
export class CrimsonExecution {
  readonly material = bloodMaterial();
  readonly mesh = new Mesh(liquidLanceGeometry(), this.material);
  update(t: number, detail: number): void {
    this.mesh.visible = t > 9.15 && t < 10.4;
    const grow = smooth(9.15, 9.5, t),
      fall = smooth(9.45, 10.1, t);
    this.mesh.position.set(0, 12.5 * (1 - fall) - 1.2 * fall, -16 * (1 - fall));
    this.mesh.rotation.z = Math.PI;
    this.mesh.rotation.x = -0.7 * (1 - fall);
    this.mesh.scale.set(5.5 * grow, 2.3 * grow * (1 + fall * 0.4), 5.5 * grow);
    updateBlood(this.material, t, detail, 0.45 + fall * 0.5);
  }
  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
