import { PointLight, Vector3, Group } from "three";
import { pulse } from "./SanguineEclipseConfig";
export class BloodLightController {
  readonly lights = [
    new PointLight(0xcc1036, 0, 35, 2),
    new PointLight(0xdc1434, 0, 32, 2),
    new PointLight(0x8a0627, 0, 28, 2),
  ];
  update(t: number, parent: Group, count: number, hand: Vector3): void {
    const eclipse = pulse(2.4, 4, 9.3, 10.4, t),
      impact = pulse(10.05, 10.15, 10.8, 13.8, t),
      residue = pulse(10.3, 11.0, 13.5, 15.7, t);
    for (let i = 0; i < 3; i++) {
      const light = this.lights[i];
      let intensity = 0;
      if (i < count && i === 0) {
        light.position.set(0, 5, -5);
        intensity = 45 * eclipse + 160 * impact + 18 * residue;
      }
      if (i < count && i === 1) {
        light.position.copy(hand);
        intensity = 9 * pulse(0, 0.25, 1.2, 2, t);
      }
      if (i < count && i === 2) {
        light.position.set(0, 11, -16);
        intensity = 45 * eclipse;
      }
      light.intensity = intensity;
      if (intensity > 0.01) {
        if (!light.parent) parent.add(light);
      } else light.removeFromParent();
    }
  }
  reset(): void {
    this.lights.forEach((l) => {
      l.intensity = 0;
      l.removeFromParent();
    });
  }
  dispose(): void {
    this.reset();
  }
}
