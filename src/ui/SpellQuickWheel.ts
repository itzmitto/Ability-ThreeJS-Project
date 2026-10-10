import type { AbilityManager } from '../abilities/AbilityManager';
import type { SpellFavorites } from './SpellFavorites';
import { paintSpellIcon } from './SpellIcon';
/** Mouse dead zone is relative to the actual rendered hub, including international-keyboard click mode. */
export class SpellQuickWheel {
  readonly element = document.createElement('dialog');
  private readonly controller = new AbortController();
  private ids: readonly string[] = [];
  private hover: number | null = null;
  private held = false;
  private readonly ring: HTMLElement;
  constructor(private readonly manager: AbilityManager, private readonly favorites: SpellFavorites, private readonly close: () => void, openBook: () => void) {
    this.element.className = 'quick-wheel'; this.element.setAttribute('aria-label', 'Favorite spell wheel');
    this.element.innerHTML = '<div class="wheel-heading">QUICK INVOCATION <button type="button" class="overlay-close" aria-label="Close Quick Wheel">✕</button></div><div class="wheel-ring"><div class="wheel-hub"><span>◇</span><strong>FAVORITES</strong><small>Move outward to choose</small></div></div><p class="wheel-help">Arrow keys + Enter · ESC cancel</p><button type="button" class="wheel-book">Manage favorites in Spellbook</button>';
    this.ring = this.element.querySelector('.wheel-ring')!; const o = { signal: this.controller.signal };
    this.ring.addEventListener('click', e => { const b = (e.target as Element).closest<HTMLButtonElement>('.wheel-spell'); if (b) { this.hover = Number(b.dataset.index); this.confirm(); } }, o);
    this.element.addEventListener('cancel', e => { e.preventDefault(); close(); }, o);
    this.element.querySelector('.overlay-close')!.addEventListener('click', close, o);
    this.element.querySelector('.wheel-book')!.addEventListener('click', openBook, o);
    this.element.addEventListener('mousemove', e => {
      const rect = this.ring.getBoundingClientRect(), dx = e.clientX - rect.left - rect.width / 2, dy = e.clientY - rect.top - rect.height / 2;
      const distance = Math.hypot(dx, dy);
      if (distance < rect.width * .16 || distance > rect.width * .53) this.hover = null;
      else { const angle = (Math.atan2(dx, -dy) + Math.PI * 2 + Math.PI / 8) % (Math.PI * 2); const index = Math.floor(angle / (Math.PI / 4)); this.hover = index < this.ids.length ? index : null; }
      this.update();
    }, o);
    this.element.addEventListener('keydown', e => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) { e.preventDefault(); if (this.ids.length) this.hover = ((this.hover ?? -1) + (e.code === 'ArrowLeft' || e.code === 'ArrowUp' ? -1 : 1) + this.ids.length) % this.ids.length; this.update(); }
      if (e.code === 'Enter') { e.preventDefault(); this.confirm(); }
    }, o);
  }
  prepare(held: boolean): void {
    this.held = held; this.hover = null; this.ids = this.favorites.all.slice(0, 8);
    this.ring.querySelectorAll('.wheel-spell').forEach(e => e.remove());
    this.ids.forEach((id, index) => {
      const a = this.manager.registry.get(id); if (!a) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'wheel-spell'; b.dataset.index = String(index); b.setAttribute('aria-label', `Select ${a.name}`); b.style.setProperty('--element-color', a.color);
      const angle = index * Math.PI / 4; b.style.left = `${50 + Math.sin(angle) * 35}%`; b.style.top = `${50 - Math.cos(angle) * 35}%`;
      const icon = document.createElement('span'); icon.className = 'spell-icon'; paintSpellIcon(icon, a);
      const name = document.createElement('strong'); name.textContent = a.name; const state = document.createElement('small'); state.className = 'wheel-state';
      b.append(icon, name, state); this.ring.append(b);
    });
    this.element.querySelector('.wheel-hub small')!.textContent = this.ids.length ? 'Move outward to choose' : 'Favorite spells in Spellbook'; this.update();
  }
  release(): void { if (this.held && this.element.open) this.confirm(); }
  private confirm(): void { if (this.hover !== null && this.ids[this.hover]) this.manager.selectAbility(this.ids[this.hover]); this.close(); }
  update(): void {
    this.ring.querySelectorAll<HTMLButtonElement>('.wheel-spell').forEach(b => {
      const i = Number(b.dataset.index), id = this.ids[i], cd = this.manager.getCooldownById(id);
      b.classList.toggle('hovered', i === this.hover); b.setAttribute('aria-pressed', String(id === this.manager.selectedAbility?.id));
      b.querySelector('.wheel-state')!.textContent = cd > 0 ? `${cd.toFixed(1)}s` : 'READY';
    });
  }
  dispose(): void { this.controller.abort(); this.element.remove(); }
}
