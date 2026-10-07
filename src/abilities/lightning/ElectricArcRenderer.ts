import { LightningRenderer } from "./LightningRenderer";
import { LightningPath } from "./LightningPath";

/** Small-arc API shared by hand feedback, conduction veins and residual node connections. */
export class ElectricArcRenderer extends LightningRenderer {
  readonly path: LightningPath;
  constructor(capacity: number) {
    super(capacity);
    this.path = new LightningPath(capacity);
  }
  commit(): void {
    this.upload(this.path);
  }
}
