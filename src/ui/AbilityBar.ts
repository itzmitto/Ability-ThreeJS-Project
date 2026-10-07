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
      if (ability?.icon && this.icons[index].textContent !== ability.icon) this.icons[index].textContent = ability.icon;
      const remaining = this.abilities.getCooldown(index);
      this.cooldowns[index].textContent = remaining > 0 ? remaining.toFixed(1) : '';
      button.classList.toggle('on-cooldown', remaining > 0);
      button.style.setProperty('--cooldown-progress', `${ability && ability.cooldown > 0 ? remaining / ability.cooldown * 100 : 0}%`);
    });
  }
  dispose(): void { this.controller.abort(); this.element.remove(); }
}
