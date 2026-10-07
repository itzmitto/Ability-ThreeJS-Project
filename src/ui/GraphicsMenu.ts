import type { GraphicsSettings } from '../quality/GraphicsSettings';
import type { QualityPreset } from '../quality/QualityPreset';
import type { PerformanceHUD } from './PerformanceHUD';
import type { TargetingSystem } from '../targeting/TargetingSystem';

export class GraphicsMenu {
  readonly element = document.createElement('div');
  private readonly controller = new AbortController();
  private readonly unsubscribe: () => void;
  constructor(settings: GraphicsSettings, performance: PerformanceHUD, targeting: TargetingSystem) {
    this.element.className = 'graphics-controls';
    this.element.innerHTML = `<div class="quality-switch" role="group" aria-label="Graphics quality"><span>QUALITY</span>${(['LOW', 'MEDIUM', 'MAX'] as const).map(preset => `<button type="button" data-quality="${preset}" aria-pressed="false">${preset === 'MEDIUM' ? 'MED' : preset}</button>`).join('')}<button type="button" class="settings-button" aria-label="Open settings" aria-expanded="false">⚙</button></div><section class="settings-panel" hidden><div class="panel-heading">SETTINGS</div><label>Mouse sensitivity <input aria-label="Mouse sensitivity" type="range" min="0.25" max="2" step="0.05" value="1"/></label><label><span>Ground aim marker</span><input type="checkbox" aria-label="Ground aim marker"/></label><label><span>Performance panel</span><input type="checkbox" aria-label="Performance panel" checked/></label><p>Esc releases the mouse.<br>Right-drag also rotates the camera.</p></section>`;
    const options = { signal: this.controller.signal };
    const buttons = Array.from(this.element.querySelectorAll<HTMLButtonElement>('[data-quality]'));
    buttons.forEach(button => button.addEventListener('click', () => { settings.setPreset(button.dataset.quality as QualityPreset); button.blur(); }, options));
    this.unsubscribe = settings.subscribe(() => buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.quality === settings.preset))));
    const toggle = this.element.querySelector<HTMLButtonElement>('.settings-button')!;
    const panel = this.element.querySelector<HTMLElement>('.settings-panel')!;
    toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; toggle.setAttribute('aria-expanded', String(!panel.hidden)); toggle.blur(); }, options);
    this.element.querySelector<HTMLInputElement>('[type=range]')!.addEventListener('input', event => { settings.mouseSensitivity = Number((event.target as HTMLInputElement).value); }, options);
    this.element.querySelector<HTMLInputElement>('[aria-label="Ground aim marker"]')!.addEventListener('change', event => { targeting.markerEnabled = (event.target as HTMLInputElement).checked; }, options);
    this.element.querySelector<HTMLInputElement>('[aria-label="Performance panel"]')!.addEventListener('change', event => { const visible = (event.target as HTMLInputElement).checked; if (visible !== performance.visible) performance.toggle(); }, options);
  }
  syncPerformance(visible: boolean): void { this.element.querySelector<HTMLInputElement>('[aria-label="Performance panel"]')!.checked = visible; }
  syncGroundMarker(visible: boolean): void { this.element.querySelector<HTMLInputElement>('[aria-label="Ground aim marker"]')!.checked = visible; }
  dispose(): void { this.controller.abort(); this.unsubscribe(); this.element.remove(); }
}
