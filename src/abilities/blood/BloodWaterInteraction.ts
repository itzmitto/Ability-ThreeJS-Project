import { Vector3 } from "three";
import type { WaterInteractionManager } from "../../world/water/WaterInteractionManager";
export class BloodWaterInteraction {
  private readonly point = new Vector3();
  private execution = false;
  private pressure = false;
  constructor(
    private readonly water: WaterInteractionManager | undefined,
    private readonly target: Vector3,
  ) {}
  lance = (index: number, local: Vector3): void => {
    this.point.copy(local).add(this.target);
    this.water?.addRipple(
      {
        position: this.point,
        strength: 0.18 + (index % 3) * 0.03,
        duration: 3,
        waveSpeed: 2.3,
        wavelength: 0.6,
        radius: 0.2,
      },
      this,
    );
  };
  update(t: number): void {
    if (t >= 8.4 && !this.pressure) {
      this.pressure = true;
      this.water?.addRipple(
        {
          position: this.target,
          strength: 0.12,
          duration: 3,
          waveSpeed: 1.7,
          wavelength: 1.8,
          radius: 0.5,
        },
        this,
      );
    }
    if (t >= 10.1 && !this.execution) {
      this.execution = true;
      for (let i = 0; i < 4; i++)
        this.water?.addRipple(
          {
            position: this.target,
            strength: 0.42 / (1 + i * 0.4),
            duration: 5.8,
            waveSpeed: 3.8 + i * 1.8,
            wavelength: 1.3 + i * 0.5,
            radius: 0.3 + i * 0.4,
          },
          this,
        );
    }
  }
  dispose(): void {
    this.water?.removeOwner(this);
  }
}
