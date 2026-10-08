import type { AbilityManager } from '../abilities/AbilityManager';

export class AbilityBar {
  readonly element = document.createElement('nav');
  private readonly buttons: HTMLButtonElement[] = [];
  private readonly labels: HTMLElement[] = [];
  private readonly icons: HTMLElement[] = [];
  private readonly cooldowns: HTMLElement[] = [];
  private controller = new AbortController();
  constructor(private readonly abilities: AbilityManager) {
    this.element.className = 'ability-bar'; this.element.setAttribute('aria-label', 'Ability slots');
    for (const [index, slot] of abilities.slots.entries()) {
      const button = document.createElement('button');
      button.className = 'ability-slot'; button.type = 'button';
      button.innerHTML = `<span class="slot-key">${slot.key}<span>${slot.number}</span></span><span class="slot-icon"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 7 25 16 16 25 7 16Z"/><path d="M16 12v8M12 16h8"/></svg></span><span class="slot-name">EMPTY</span><span class="slot-cooldown"></span>`;
      button.addEventListener('click', () => { abilities.select(index); button.blur(); this.update(); }, { signal: this.controller.signal });
      this.buttons.push(button);
      this.labels.push(button.querySelector<HTMLElement>('.slot-name')!);
      this.icons.push(button.querySelector<HTMLElement>('.slot-icon')!);
      this.cooldowns.push(button.querySelector<HTMLElement>('.slot-cooldown')!);
      this.element.append(button);
    }
    this.update();
  }
  update(): void {
    this.buttons.forEach((button, index) => {
      const selected = index === this.abilities.selectedIndex;
      button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
      const ability = this.abilities.registry.get(this.abilities.slots[index].abilityId);
      const name = ability?.name ?? 'EMPTY';
      if (this.labels[index].textContent !== name) this.labels[index].textContent = name;
      button.style.setProperty('--element-color', ability?.color ?? '#8caac4');
      button.setAttribute('aria-label', `${this.abilities.slots[index].key}: ${name}`);
      // Icons are text glyphs; untrusted markup is never inserted into the UI.
      if (ability?.icon === 'blood-eclipse') {
        if (this.icons[index].dataset.icon !== 'blood-eclipse') {
          this.icons[index].innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M26 12a10 10 0 1 0-20 0M10 12a6 6 0 0 1 12 0M16 7l2 11-2 9-2-9ZM7 17c-4 5-3 8 0 8s4-3 0-8ZM25 17c-4 5-3 8 0 8s4-3 0-8Z"/></svg>';
          this.icons[index].dataset.icon = 'blood-eclipse';
        }
      } else if (ability?.icon === 'storm-dragon') {
        if (this.icons[index].dataset.icon !== 'storm-dragon') {
          this.icons[index].innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m4 5 7 5 3-6-1 9 5-3 7-6-3 10 6 4-8 2-3 6-5-1 1-4-5-5 2-6Z"/><path d="m17 15 3-1-2 4M5 20l-3 5 9-3M23 23l6 5-2-7"/></svg>';
          this.icons[index].dataset.icon = 'storm-dragon';
        }
      } else if (ability?.icon && this.icons[index].textContent !== ability.icon) this.icons[index].textContent = ability.icon;
      const remaining = this.abilities.getCooldown(index);
      this.cooldowns[index].textContent = remaining > 0 ? remaining.toFixed(1) : '';
      button.classList.toggle('on-cooldown', remaining > 0);
      button.style.setProperty('--cooldown-progress', `${ability && ability.cooldown > 0 ? remaining / ability.cooldown * 100 : 0}%`);
    });
  }
  dispose(): void { this.controller.abort(); this.element.remove(); }
}
