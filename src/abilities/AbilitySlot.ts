export interface AbilitySlot { readonly key: string; readonly code: string; readonly number: number | null; readonly shift?: boolean; abilityId: string | null; }
export function createAbilitySlots(): AbilitySlot[] {
  const slots: AbilitySlot[] = ['Q', 'E', 'R', 'F', 'V', 'X', 'C', 'B', 'N', 'G', 'H', 'J', 'K', 'L', 'M', 'U', 'I', 'O', 'Y', 'Z'].map((key, index) => ({ key, code: `Key${key}`, number: index < 9 ? index + 1 : index === 9 ? 0 : null, abilityId: null }));
  slots.push({ key: 'Shift+1', code: 'Digit1', number: null, shift: true, abilityId: null });
  slots.push({ key: 'Shift+2', code: 'Digit2', number: null, shift: true, abilityId: null });
  slots.push({ key: 'Shift+3', code: 'Digit3', number: null, shift: true, abilityId: null });
  slots.push({ key: 'Shift+4', code: 'Digit4', number: null, shift: true, abilityId: null });
  slots.push({ key: 'Shift+5', code: 'Digit5', number: null, shift: true, abilityId: null });
  slots.push({ key: 'Shift+6', code: 'Digit6', number: null, shift: true, abilityId: null });
  slots.push({ key: 'Shift+7', code: 'Digit7', number: null, shift: true, abilityId: null });
  return slots;
}
