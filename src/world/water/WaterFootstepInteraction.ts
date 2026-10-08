import { Vector3 } from "three";
import type { Player } from "../../player/Player";
import type { WaterInteractionManager } from "./WaterInteractionManager";
import type { WaterContactSpray } from "./WaterContactSpray";
/** Distance-integrated locomotion phase, alternating actual shoe anchors. No idle emissions. */
export class WaterFootstepInteraction {
  private travel = 0;
  private side: "left" | "right" = "left";
  private lastTime: number | null = null;
  private readonly shoe = new Vector3();
  constructor(
    private readonly water: WaterInteractionManager,
    private readonly spray?: WaterContactSpray,
  ) {}
  update(time: number, player: Player): void {
    const dt =
      this.lastTime === null
        ? 0
        : Math.min(0.05, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    const speed = Math.hypot(player.velocity.x, player.velocity.z);
    if (speed < 0.3) {
      this.travel = 0;
      return;
    }
    this.travel += speed * dt;
    const stride = speed > 6 ? 1.35 : 0.83;
    if (this.travel < stride) return;
    this.travel %= stride;
    player.visual.getFootWorldPosition(this.side, this.shoe);
    this.side = this.side === "left" ? "right" : "left";
    this.shoe.y = 0;
    this.water.addRipple(
      {
        position: this.shoe,
        strength: speed > 6 ? 0.13 : 0.075,
        duration: speed > 6 ? 1.7 : 1.3,
        waveSpeed: speed > 6 ? 1.6 : 1.1,
        wavelength: 0.28,
        radius: 0.09,
      },
      this,
    );
    this.spray?.emit(
      this.shoe,
      time,
      this.water.capacity <= 8 ? 2 : this.water.capacity <= 20 ? 4 : 6,
    );
  }
  dispose(): void {
    this.water.removeOwner(this);
  }
}
