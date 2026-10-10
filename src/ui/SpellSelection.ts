import type { AbilityManager } from '../abilities/AbilityManager';
import type { InputManager } from '../game/InputManager';
import { Spellbook } from './Spellbook';
import { SpellQuickWheel } from './SpellQuickWheel';
import { SpellFavorites } from './SpellFavorites';
import { paintSpellIcon } from './SpellIcon';
export class SpellSelection {
  readonly element = document.createElement('section');
  readonly book: Spellbook;
  readonly wheel: SpellQuickWheel;
  readonly favorites: SpellFavorites;
  private readonly controller = new AbortController();
  private readonly icon: HTMLElement;
  private readonly name: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly status: HTMLElement;
  constructor(root: HTMLElement, private readonly manager: AbilityManager, private readonly input: InputManager | undefined) {
    this.favorites = new SpellFavorites(manager.registry.all.map(a => a.id));
    this.book = new Spellbook(manager, this.favorites, this.close);
    this.wheel = new SpellQuickWheel(manager, this.favorites, this.close, () => this.openBook());
    this.element.className = 'selected-spell'; this.element.setAttribute('aria-label', 'Selected spell');
    this.element.innerHTML = '<span class="selected-icon spell-icon"></span><div class="selected-details"><span class="eyebrow">EQUIPPED INVOCATION</span><strong class="selected-name"></strong><small class="selected-detail"></small><span class="selected-status"></span></div><div class="spell-actions"><button type="button" data-open-book>Spellbook <kbd>TAB</kbd></button><button type="button" data-open-wheel>Quick Wheel <kbd>`</kbd></button></div><div class="selected-cooldown"></div>';
    this.icon = this.element.querySelector('.selected-icon')!; this.name = this.element.querySelector('.selected-name')!; this.detail = this.element.querySelector('.selected-detail')!; this.status = this.element.querySelector('.selected-status')!;
    this.element.querySelector('[data-open-book]')!.addEventListener('click', () => this.openBook(), { signal: this.controller.signal });
    this.element.querySelector('[data-open-wheel]')!.addEventListener('click', () => this.openWheel(false), { signal: this.controller.signal });
    root.append(this.element, this.book.element, this.wheel.element);
    if (input) { input.onSpellbookRequest = () => this.openBook(); input.onWheelRequest = () => this.openWheel(true); input.onWheelRelease = () => this.wheel.release(); }
    this.update();
  }
  openBook(): void { this.close(); this.input?.setOverlayActive(true); this.book.update(); this.book.element.showModal(); this.book.focusSearch(); }
  openWheel(held: boolean): void { this.close(); this.input?.setOverlayActive(true); this.wheel.prepare(held); this.wheel.element.showModal(); this.wheel.element.querySelector<HTMLButtonElement>('.overlay-close')!.focus(); }
  close = (): void => { if (this.book?.element.open) this.book.element.close(); if (this.wheel?.element.open) this.wheel.element.close(); this.input?.setOverlayActive(false); document.querySelector<HTMLCanvasElement>('.world-canvas')?.focus(); this.update(); };
  update(): void {
    const a = this.manager.selectedAbility; if (!a) return;
    this.element.style.setProperty('--element-color', a.color); paintSpellIcon(this.icon, a); this.name.textContent = a.name;
    this.detail.textContent = `${a.element} · ${a.range === undefined ? 'Range —' : `${a.range}m range`}`;
    const cd = this.manager.getCooldownById(a.id); this.status.textContent = cd > 0 ? `RECOVERING · ${cd.toFixed(1)}s` : 'READY · LEFT CLICK TO CAST';
    this.element.style.setProperty('--selected-cooldown', `${cd / Math.max(.01, a.cooldown) * 100}%`);
    if (this.book.element.open) this.book.update(); if (this.wheel.element.open) this.wheel.update();
  }
  dispose(): void { this.close(); this.controller.abort(); this.book.dispose(); this.wheel.dispose(); this.element.remove(); if (this.input) { this.input.onSpellbookRequest = this.input.onWheelRequest = this.input.onWheelRelease = undefined; } }
}
