export interface AbilitySlot { readonly key: string; readonly code: string; readonly number: number; abilityId: string | null; }
export function createAbilitySlots(): AbilitySlot[] {
  return ['Q', 'E', 'R', 'F', 'V', 'X', 'C', 'B'].map((key, index) => ({ key, code: `Key${key}`, number: index + 1, abilityId: null }));
}
