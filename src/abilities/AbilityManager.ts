import type { InputManager } from '../game/InputManager';
import type { AbilityCastContext } from './Ability';
import { AbilityRegistry } from './AbilityRegistry';
import { createAbilitySlots } from './AbilitySlot';

export class AbilityManager {
  readonly slots = createAbilitySlots();
  readonly registry = new AbilityRegistry();
  selectedIndex = 0;
  private cooldowns = new Map<string, number>();
  get selectedAbility() { return this.registry.get(this.slots[this.selectedIndex].abilityId); }
  select(index: number): void {
    if (index < 0 || index >= this.slots.length || index === this.selectedIndex) return;
    this.selectedAbility?.deselect?.(); this.selectedIndex = index; this.selectedAbility?.select?.();
  }
  assignSlot(index: number, abilityId: string): void {
    if (!this.slots[index] || !this.registry.get(abilityId)) throw new Error('Assign a registered ability to a valid slot');
    if (index === this.selectedIndex) this.selectedAbility?.deselect?.();
    this.slots[index].abilityId = abilityId;
    if (index === this.selectedIndex) this.selectedAbility?.select?.();
  }
  handleInput(input: InputManager, makeContext: () => AbilityCastContext): void {
    for (let i = 0; i < this.slots.length; i++) if (input.wasPressed(this.slots[i].code) || (this.slots[i].number !== null && input.wasPressed(`Digit${this.slots[i].number}`))) this.select(i);
    if (input.wantsCast && this.selectedAbility && this.getCooldown(this.selectedIndex) === 0) this.cast(makeContext());
  }
  cast(context: AbilityCastContext): boolean {
    const ability = this.selectedAbility;
    if (!ability || this.getCooldown(this.selectedIndex) > 0) return false;
    if (ability.cast(context) === false) return false;
    this.cooldowns.set(ability.id, Math.max(0, ability.cooldown)); return true;
  }
  getCooldown(index: number): number { return this.cooldowns.get(this.slots[index]?.abilityId ?? '') ?? 0; }
  update(delta: number): void {
    for (const [id, time] of this.cooldowns) { const remaining = Math.max(0, time - delta); if (remaining === 0) this.cooldowns.delete(id); else this.cooldowns.set(id, remaining); }
    this.registry.update(delta);
  }
  dispose(): void { this.selectedAbility?.deselect?.(); this.registry.dispose(); this.cooldowns.clear(); }
}
