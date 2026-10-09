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
      button.innerHTML = `<span class="slot-key">${slot.key}<span>${slot.number ?? ''}</span></span><span class="slot-icon"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 7 25 16 16 25 7 16Z"/><path d="M16 12v8M12 16h8"/></svg></span><span class="slot-name">EMPTY</span><span class="slot-cooldown"></span>`;
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
      if (ability?.icon === 'dragonfire') {
        if (this.icons[index].dataset.icon !== ability.icon) {
          this.icons[index].innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#eb6a2f" d="M9 28C-1 23 5 15 8 12c-1 6 6 3 4-3l4-7c1 9 10 11 8 19 6-3 2-8 3-11 6 11 3 17-4 19"/><path stroke="#ffd67a" d="M14 28c-5-4 0-8 2-13 0 5 6 6 4 11m-8 3h10"/></svg>';
          this.icons[index].dataset.icon = ability.icon;
        }
      } else if (ability?.icon === 'prism-ravenstorm') {
        if (this.icons[index].dataset.icon !== ability.icon) {
          this.icons[index].innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#edf7ff" d="m4 26 4-8 4 4ZM11 17l6-10 3 4-6 8Z"/><path stroke="#bcaceb" d="m19 21 9-4-3 6-7 1Zm-7-9 1-8 4-2-2 9Z"/><path stroke="#80ddcd" d="m21 10 7-8-3 10-4 2Z"/><path stroke="#f0b4bd" d="m3 28 9-2m-7-11 3-4M17 28l7 1"/></svg>';
          this.icons[index].dataset.icon = ability.icon;
        }
      } else if (ability?.icon === 'kraken-crown') {
        if (this.icons[index].dataset.icon !== ability.icon) {
          this.icons[index].innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><ellipse stroke="#397886" cx="16" cy="27" rx="12" ry="3"/><path stroke="#97b4c8" d="M8 27C-1 15 3 4 8 5c6 2 1 9-1 6-2-3 4-3 4 4l1 11M14 26c-5-10-4-23 2-24 7-1 7 10 3 10-4-1 0-6 2-3m-2 3-1 14m4 1c7-6 9-19 4-19-6-1-6 7-2 6 2-1-1-4-2-1-2 3-2 8-1 14"/><path stroke="#56d3bc" d="m5 16 1 2m1 3 1 2m6-12 1 2m0 3 1 2m10-2-1 2m-1 3-1 2"/></svg>';
          this.icons[index].dataset.icon = ability.icon;
        }
      } else if (ability?.icon === 'chrono-fracture') {
        if (this.icons[index].dataset.icon !== ability.icon) {
          this.icons[index].innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#dfc281" d="M26 9A12 12 0 1 0 25 25M16 6v3M6 16h3m7 7v3M23 16h3M16 16V9m0 7-6 4"/><path stroke="#91dcef" d="m25 3-5 9 7 4-6 7 3 6M16 13l2 3-2 2-2-2Z"/></svg>';
          this.icons[index].dataset.icon = ability.icon;
        }
      } else if (ability?.icon === 'shadow-colossus') {
        if (this.icons[index].dataset.icon !== ability.icon) {
          this.icons[index].innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#b599df" d="M4 29 2 18l2-9 2 1-1 7 2-11 2 1-1 10 3-9 2 1-3 10 4-5 2 2-6 10v4M28 29l2-11-2-9-2 1 1 7-2-11-2 1 1 10-3-9-2 1 3 10-4-5-2 2 6 10v4"/><circle stroke="#9b64d0" cx="16" cy="21" r="3"/><path stroke="#775093" d="M12 29h8"/></svg>';
          this.icons[index].dataset.icon = ability.icon;
        }
      } else if (ability?.icon === 'seraphic-deluge') {
        if (this.icons[index].dataset.icon !== ability.icon) {
          this.icons[index].innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#e9ca75" d="M3 9c2-5 24-5 26 0M3 26c5 4 21 4 26 0"/><path stroke="#fff5da" d="m8 7 1 6-1 11-1-11ZM16 3l1 8-1 16-1-16ZM24 7l1 6-1 11-1-11ZM5 13h6m2-2h6m2 2h6"/><path stroke="#dbc078" d="m4 17 1 5m23-5-1 5"/></svg>';
          this.icons[index].dataset.icon = ability.icon;
        }
      } else if (ability?.icon === 'prismatic-cathedral') {
        if (this.icons[index].dataset.icon !== ability.icon) {
          this.icons[index].innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#eaf7ff" d="m16 2 5 10-2 17h-6l-2-17ZM16 2v27"/><path stroke="#8ddfed" d="m5 13 5 7-1 9H5L3 20Zm22-2 3 9-3 9h-4l-1-9Z"/><path stroke="#db9de8" d="m7 5 1 3 3 1-3 1-1 3-1-3-3-1 3-1M25 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1"/><path stroke="#eee2aa" d="M11 12l5 5 5-5"/></svg>';
          this.icons[index].dataset.icon = ability.icon;
        }
      } else if (ability?.icon === 'heavenly-arsenal') {
        if (this.icons[index].dataset.icon !== ability.icon) {
          this.icons[index].innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#fff7d8" d="m16 2 2 11 10 3-10 2-2 12-2-12-10-2 10-3ZM16 7v18M9 16h14"/><path stroke="#e4c76e" d="m6 5 1 5 4 1-4 1-1 4-1-4-3-1 3-1Zm20 16 1 4 3 1-3 1-1 3-1-3-3-1 3-1Z"/></svg>';
          this.icons[index].dataset.icon = ability.icon;
        }
      } else if (ability?.icon === 'cryo-collapse' || ability?.icon === 'thunderlance' || ability?.icon === 'solar-nova') {
        if (this.icons[index].dataset.icon !== ability.icon) {
          const symbols = {
            'cryo-collapse': '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="8"/><path d="M16 3v26M5 9l22 14M5 23 27 9m-14-5 3 3 3-3M4 12l4-1-1-4m17 1-1 4 4 1M3 17c-1 8 25 10 26-1"/></svg>',
            'thunderlance': '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m5 28 13-15-3-1L28 3l-6 14-2-3-13 15M6 5l5 3-3 4 5 3M20 23l4-3 4 3-2 5"/></svg>',
            'solar-nova': '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="6"/><path d="m16 2 1 7M16 23v7M2 16l7-1m14 1h7M6 6l5 5m10 10 5 5M6 26l5-5M21 11l5-5M9 3l2 4m14 5 4-2M3 23l4-2m14 4 2 4"/></svg>',
          };
          this.icons[index].innerHTML = symbols[ability.icon];
          this.icons[index].dataset.icon = ability.icon;
        }
      } else if (ability?.icon === 'glass-tempest' || ability?.icon === 'gravity-crush' || ability?.icon === 'worldroot') {
        if (this.icons[index].dataset.icon !== ability.icon) {
          const symbols = {
            'glass-tempest': '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m7 25 2-12 11-9-4 11ZM16 15l10-6-5 15-5 5ZM3 17l3-3M23 5l4-2M25 27l4 2"/></svg>',
            'gravity-crush': '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="4"/><ellipse cx="16" cy="16" rx="13" ry="6" transform="rotate(-30 16 16)"/><ellipse cx="16" cy="16" rx="6" ry="13" transform="rotate(-30 16 16)"/><path d="m3 6 5 2-2-5m23 23-5-2 2 5"/></svg>',
            'worldroot': '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 29V15M16 23l-7-5-3-7m10 10 7-5 4-9M16 17C7 16 7 6 7 4c9 0 12 5 9 13Zm1-3c0-7 5-10 11-10 0 6-3 10-11 10ZM9 18l-4 2m18-4 5 2M16 27l-5 3m5-4 5 4"/></svg>',
          };
          this.icons[index].innerHTML = symbols[ability.icon];
          this.icons[index].dataset.icon = ability.icon;
        }
      } else if (ability?.icon === 'earthbreaker' || ability?.icon === 'tidal-sovereign') {
        if (this.icons[index].dataset.icon !== ability.icon) {
          this.icons[index].innerHTML = ability.icon === 'earthbreaker'
            ? '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#edb655" d="m7 23-3-9 7-9 10 2 7 10-5 10-12 1Z"/><path stroke="#ffdc8f" d="m11 5 4 10-5 5 4 8m1-13 7-4m-7 4 6 5 7-3m-7 3 2 7"/></svg>'
            : '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#65daed" d="M3 25c5 2 9-1 10-6 2-8 11-11 15-6-7-2-10 4-6 7 3 2 5 1 7 0M3 28h26"/><path stroke="#cafaff" d="M5 20c4-1 6-4 8-8 3-6 8-8 13-6M7 11l-2-3m22 1 2-2"/></svg>';
          this.icons[index].dataset.icon = ability.icon;
        }
      } else if (ability?.icon === 'spectral-break') {
        if (this.icons[index].dataset.icon !== 'spectral-break') {
          this.icons[index].innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path stroke="#aafaff" d="m16 3 2 10 11 3-11 3-2 10-2-10-11-3 11-3Z"/><path stroke="#6c8aff" d="m3 6 8 6M21 20l8 6M5 25l6-5"/><path stroke="#df70ef" d="m22 5-3 5M10 22l-3 6"/></svg>';
          this.icons[index].dataset.icon = 'spectral-break';
        }
      } else if (ability?.icon === 'blood-eclipse') {
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
