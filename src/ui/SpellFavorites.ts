/** Stable IDs, ordered favorites and defensive storage. More than eight may be saved; the wheel uses the first eight. */
export class SpellFavorites {
  private ids = new Set<string>();
  private valid = new Set<string>();
  revision = 0;
  constructor(ids: readonly string[]) {
    this.valid = new Set(ids);
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('elemental-favorites') ?? '[]');
      if (Array.isArray(stored)) this.ids = new Set(stored.filter((id): id is string => typeof id === 'string' && this.valid.has(id)));
    } catch { /* Favorites work without storage. */ }
    this.save();
  }
  sync(ids: readonly string[]): void { this.valid = new Set(ids); for (const id of this.ids) if (!this.valid.has(id)) this.ids.delete(id); this.save(); }
  has(id: string): boolean { return this.ids.has(id); }
  get all(): readonly string[] { return [...this.ids]; }
  toggle(id: string): void { if (!this.valid.has(id)) return; this.ids.has(id) ? this.ids.delete(id) : this.ids.add(id); this.revision++; this.save(); }
  private save(): void { try { localStorage.setItem('elemental-favorites', JSON.stringify([...this.ids])); } catch { /* Optional. */ } }
}
