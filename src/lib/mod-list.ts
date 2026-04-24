export interface CategoryWithMods<TMod extends { id: number; categoryId: number; sortOrder: number }> {
  id: number;
  mods: TMod[];
}

export function upsertModInCategory<
  TMod extends { id: number; categoryId: number; sortOrder: number },
  TCategory extends CategoryWithMods<TMod>,
>(categories: TCategory[], categoryId: number, mod: TMod): TCategory[] {
  return categories.map((category) => {
    const modsWithoutCreated = category.mods.filter((item) => item.id !== mod.id);

    if (category.id !== categoryId) {
      return { ...category, mods: modsWithoutCreated };
    }

    const nextMods = [
      ...modsWithoutCreated,
      { ...mod, categoryId },
    ].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

    return { ...category, mods: nextMods };
  });
}
