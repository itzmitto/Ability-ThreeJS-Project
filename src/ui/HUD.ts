import type { AbilityManager } from '../abilities/AbilityManager';
import type { GraphicsSettings } from '../quality/GraphicsSettings';
import type { TargetingSystem } from '../targeting/TargetingSystem';
import type { Player } from '../player/Player';
import type { CameraController } from '../game/CameraController';
import { AbilityBar } from './AbilityBar';
import { GraphicsMenu } from './GraphicsMenu';
import { PerformanceHUD } from './PerformanceHUD';

export class HUD {
  readonly element = document.createElement('div');
  readonly abilityBar: AbilityBar;
  readonly performance = new PerformanceHUD();
  readonly graphics: GraphicsMenu;
  private readonly debug = document.createElement('pre');
  private readonly inputHint = document.createElement('div');
  private readonly selected = document.createElement('span');
  constructor(root: HTMLElement, private readonly abilities: AbilityManager, private readonly settings: GraphicsSettings, targeting: TargetingSystem) {
    this.element.className = 'hud';
    this.element.innerHTML = `<header class="brand"><div class="eyebrow"><span class="brand-mark">◇</span> EXPERIMENTAL ARENA <span class="version">/ 001</span></div><h1>ELEMENTAL <span>SANDBOX</span></h1><p>WASD move <b>·</b> Mouse aim <b>·</b> Q/E/R/F/V/X abilities <b>·</b> Click cast</p></header><div class="crosshair" aria-hidden="true"><i></i></div><div class="world-caption"><span class="caption-line"></span>THE STILLWATER<span class="caption-sub">FOUNDATION WORLD</span></div><div class="footer-note">PHASE 02 <span>/</span> GLACIAL ERUPTION</div><div class="debug-hint">F3 DEBUG <span>·</span> P TELEMETRY</div>`;
    this.abilityBar = new AbilityBar(abilities);
    this.graphics = new GraphicsMenu(settings, this.performance, targeting);
    this.debug.className = 'debug-panel'; this.debug.hidden = true;
    this.inputHint.className = 'input-hint'; this.inputHint.textContent = 'CLICK THE WORLD TO CAPTURE MOUSE';
    this.selected.className = 'selection-label'; this.selected.textContent = '01 / EMPTY SLOT';
    this.element.append(this.abilityBar.element, this.performance.element, this.graphics.element, this.debug, this.inputHint, this.selected);
    root.append(this.element);
  }
  update(pointerLocked: boolean): void {
    this.abilityBar.update();
    this.inputHint.hidden = pointerLocked;
    const text = `${String(this.abilities.selectedIndex + 1).padStart(2, '0')} / ${this.abilities.selectedAbility?.name ?? 'EMPTY SLOT'}`;
    if (this.selected.textContent !== text) this.selected.textContent = text;
  }
  toggleDebug(): void { this.debug.hidden = !this.debug.hidden; }
  updateDebug(player: Player, camera: CameraController, targeting: TargetingSystem): void {
    if (this.debug.hidden) return;
    const format = (vector: { x: number; y: number; z: number }): string => `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
    this.debug.textContent = `FOUNDATION DEBUG\nPlayer    ${format(player.position)}\nCamera    ${format(camera.camera.position)}\nAim       ${format(targeting.aimDirection)}\nTarget    ${format(targeting.targetPoint)}\nGround    ${targeting.hasGroundTarget ? 'HIT' : 'OUT OF RANGE / SKY'}\nRange     ${targeting.maxDistance} m\nSlot      ${this.abilities.selectedIndex + 1} / ${this.abilities.selectedAbility?.id ?? 'empty'}\nQuality   ${this.settings.preset}`;
  }
  dispose(): void { this.abilityBar.dispose(); this.graphics.dispose(); this.element.remove(); }
}
