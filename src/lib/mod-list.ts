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

export function removeModsFromCategories<
  TMod extends { id: number },
  TCategory extends { mods: TMod[] },
>(categories: TCategory[], modIds: Iterable<number>): TCategory[] {
  const ids = new Set(modIds);
  if (ids.size === 0) return categories;

  return categories.map((category) => ({
    ...category,
    mods: category.mods.filter((mod) => !ids.has(mod.id)),
  }));
}

export function replaceModInCategories<
  TMod extends { id: number; categoryId: number; sortOrder: number },
  TCategory extends CategoryWithMods<TMod>,
>(categories: TCategory[], previousModId: number, mod: TMod): TCategory[] {
  return upsertModInCategory(
    removeModsFromCategories(categories, [previousModId]),
    mod.categoryId,
    mod,
  );
}

export function updateModInCategories<
  TCategory extends { mods: { id: number }[] },
>(
  categories: TCategory[],
  modId: number,
  update: Partial<TCategory['mods'][number]>,
): TCategory[] {
  return categories.map((category) => ({
    ...category,
    mods: category.mods.map((mod) => mod.id === modId ? { ...mod, ...update } : mod),
  })) as TCategory[];
}
