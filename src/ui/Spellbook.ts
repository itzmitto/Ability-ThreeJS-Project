import type { AbilityManager } from '../abilities/AbilityManager';
import { SPELL_CATEGORIES, matchesSpell, type SpellCategory } from './SpellCatalog';
import type { SpellFavorites } from './SpellFavorites';
import { paintSpellIcon } from './SpellIcon';
export class Spellbook {
  readonly element = document.createElement('dialog');
  private readonly controller = new AbortController();
  private readonly cards = new Map<string, HTMLElement>();
  private readonly grid: HTMLElement;
  private readonly search: HTMLInputElement;
  private readonly count: HTMLElement;
  private category: SpellCategory = 'ALL';
  private revision = -1;
  constructor(private readonly manager: AbilityManager, private readonly favorites: SpellFavorites, close: () => void) {
    this.element.className = 'spellbook'; this.element.setAttribute('aria-labelledby', 'spellbook-title');
    this.element.innerHTML = '<header class="spellbook-header"><div><span class="eyebrow">THE ELEMENTAL ARCHIVE</span><h2 id="spellbook-title">Spellbook</h2><p>Choose your next invocation.</p></div><button type="button" class="overlay-close" aria-label="Close Spellbook">✕</button></header><div class="spellbook-tools"><input type="search" aria-label="Search spells" placeholder="Search name, element or subtitle…" autocomplete="off"><span class="spellbook-count" aria-live="polite"></span></div><div class="spell-filters" role="group" aria-label="Element filters"></div><div class="spell-grid"></div><footer>Click a spell to equip <span>·</span> ☆ Save favorites for the quick wheel <span>·</span> ESC close</footer>';
    this.element.querySelector('footer')!.textContent = 'Click a spell to equip · ☆ First eight favorites appear in Quick Wheel · ESC close';
    this.grid = this.element.querySelector('.spell-grid')!; this.search = this.element.querySelector('input')!; this.count = this.element.querySelector('.spellbook-count')!;
    const o = { signal: this.controller.signal };
    this.element.querySelector('.overlay-close')!.addEventListener('click', close, o);
    this.element.addEventListener('cancel', e => { e.preventDefault(); close(); }, o);
    this.search.addEventListener('input', () => this.filter(), o);
    for (const category of SPELL_CATEGORIES) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = category; b.dataset.category = category; b.setAttribute('aria-pressed', String(category === this.category));
      b.addEventListener('click', () => { this.category = category; this.filter(); }, o); this.element.querySelector('.spell-filters')!.append(b);
    }
    this.grid.addEventListener('click', e => {
      const b = (e.target as Element).closest<HTMLButtonElement>('button'); if (!b) return;
      if (b.dataset.favorite) { this.favorites.toggle(b.dataset.favorite); this.update(); return; }
      if (b.dataset.spell) { this.manager.selectAbility(b.dataset.spell); close(); }
    }, o);
    this.update();
  }
  update(): void {
    if (this.revision !== this.manager.registry.revision) {
      this.revision = this.manager.registry.revision; this.cards.clear(); this.grid.replaceChildren();
      const all = this.manager.registry.all; this.favorites.sync(all.map(a => a.id));
      for (const a of all) {
        const card = document.createElement('article'); card.className = 'spell-card'; card.style.setProperty('--element-color', a.color);
        const select = document.createElement('button'); select.type = 'button'; select.dataset.spell = a.id; select.className = 'spell-equip'; select.setAttribute('aria-label', `Equip ${a.name}`);
        const icon = document.createElement('span'); icon.className = 'spell-icon'; paintSpellIcon(icon, a);
        const name = document.createElement('strong'); name.textContent = a.name;
        const subtitle = document.createElement('small'); subtitle.textContent = a.subtitle ?? spellCategoryLabel(a.element);
        const element = document.createElement('span'); element.className = 'spell-element'; element.textContent = a.element;
        const stats = document.createElement('span'); stats.className = 'spell-stats'; stats.textContent = `${a.cooldown}s cooldown · ${a.range === undefined ? 'Range not specified' : `${a.range}m range`}`;
        const state = document.createElement('span'); state.className = 'spell-state';
        select.append(icon, name, subtitle, element, stats, state);
        const favorite = document.createElement('button'); favorite.type = 'button'; favorite.className = 'spell-favorite'; favorite.dataset.favorite = a.id; favorite.setAttribute('aria-label', `Favorite ${a.name}`);
        card.append(select, favorite); this.cards.set(a.id, card); this.grid.append(card);
      }
      this.filter();
    }
    for (const a of this.manager.registry.all) {
      const card = this.cards.get(a.id)!; const remaining = this.manager.getCooldownById(a.id);
      card.classList.toggle('selected', this.manager.selectedAbility?.id === a.id);
      card.querySelector('.spell-equip')!.setAttribute('aria-pressed', String(this.manager.selectedAbility?.id === a.id));
      card.querySelector('.spell-state')!.textContent = remaining > 0 ? `RECOVERING · ${remaining.toFixed(1)}s` : 'READY TO CAST';
      const favorite = card.querySelector('button.spell-favorite')!; favorite.textContent = this.favorites.has(a.id) ? '★' : '☆'; favorite.setAttribute('aria-pressed', String(this.favorites.has(a.id)));
    }
  }
  private filter(): void {
    let count = 0; for (const a of this.manager.registry.all) { const shown = matchesSpell(a, this.search.value, this.category); this.cards.get(a.id)!.hidden = !shown; if (shown) count++; }
    this.count.textContent = `${count} / ${this.cards.size} spells`;
    this.element.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.category === this.category)));
    this.grid.classList.toggle('empty', count === 0); this.grid.dataset.empty = 'No spells found. Try another element or search.';
  }
  focusSearch(): void { this.search.focus(); }
  dispose(): void { this.controller.abort(); this.element.remove(); }
}
function spellCategoryLabel(element: string): string { return element; }
