import type { Ability } from './Ability';

export class AbilityRegistry {
  private readonly abilities = new Map<string, Ability>();
  revision = 0;
  get all(): readonly Ability[] { return Array.from(this.abilities.values()); }
  register(ability: Ability): void {
    if (this.abilities.has(ability.id)) throw new Error(`Ability already registered: ${ability.id}`);
    this.abilities.set(ability.id, ability);
    this.revision++;
  }
  get(id: string | null): Ability | undefined { return id === null ? undefined : this.abilities.get(id); }
  update(delta: number): void { for (const ability of this.abilities.values()) ability.update?.(delta); }
  dispose(): void { for (const ability of this.abilities.values()) ability.dispose?.(); this.abilities.clear(); }
}
