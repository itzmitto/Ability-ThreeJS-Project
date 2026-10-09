export interface AbilitySlot { readonly key: string; readonly code: string; readonly number: number | null; abilityId: string | null; }
export function createAbilitySlots(): AbilitySlot[] {
  return ['Q', 'E', 'R', 'F', 'V', 'X', 'C', 'B', 'N', 'G', 'H', 'J', 'K', 'L', 'M', 'U', 'I'].map((key, index) => ({ key, code: `Key${key}`, number: index < 9 ? index + 1 : index === 9 ? 0 : null, abilityId: null }));
}
