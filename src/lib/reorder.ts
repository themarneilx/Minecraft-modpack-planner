export interface ReorderableMod {
  id: number;
  categoryId: number;
  sortOrder: number;
}

export interface ReorderableCategory<TMod extends ReorderableMod> {
  id: number;
  sortOrder: number;
  mods: TMod[];
}

export interface DragLocation {
  modId: number;
  sourceCategoryId: number;
}

export interface DropLocation {
  targetCategoryId: number;
  beforeModId: number | null;
}

export interface CategoryDropLocation {
  beforeCategoryId: number | null;
}

export interface CategoryOrderPayload {
  categoryId: number;
  modIds: number[];
}

export interface ReorderResult<TCategory> {
  categories: TCategory[];
  affectedCategories: CategoryOrderPayload[];
}

export interface CategoryReorderResult<TCategory> {
  categories: TCategory[];
  categoryIds: number[];
}

export function moveModInCategories<
  TMod extends ReorderableMod,
  TCategory extends ReorderableCategory<TMod>,
>(
  categories: TCategory[],
  drag: DragLocation,
  drop: DropLocation,
): ReorderResult<TCategory> {
  const sourceCategory = categories.find((category) => category.id === drag.sourceCategoryId);
  const targetCategory = categories.find((category) => category.id === drop.targetCategoryId);

  if (!sourceCategory) {
    throw new Error(`Source category ${drag.sourceCategoryId} was not found`);
  }

  if (!targetCategory) {
    throw new Error(`Target category ${drop.targetCategoryId} was not found`);
  }

  const draggedMod = sourceCategory.mods.find((mod) => mod.id === drag.modId);

  if (!draggedMod) {
    throw new Error(`Mod ${drag.modId} was not found in category ${drag.sourceCategoryId}`);
  }

  const affectedIds = new Set([drag.sourceCategoryId, drop.targetCategoryId]);
  const modsByCategory = new Map(
    categories.map((category) => [
      category.id,
      category.mods.filter((mod) => mod.id !== drag.modId),
    ]),
  );
  const targetMods = modsByCategory.get(drop.targetCategoryId);

  if (!targetMods) {
    throw new Error(`Target category ${drop.targetCategoryId} was not found`);
  }

  const insertIndex = drop.beforeModId === null
    ? targetMods.length
    : targetMods.findIndex((mod) => mod.id === drop.beforeModId);

  if (insertIndex < 0) {
    throw new Error(`Drop target mod ${drop.beforeModId} was not found`);
  }

  targetMods.splice(insertIndex, 0, { ...draggedMod, categoryId: drop.targetCategoryId });
  modsByCategory.set(drop.targetCategoryId, targetMods);

  const nextCategories = categories.map((category) => ({
    ...category,
    mods: (modsByCategory.get(category.id) ?? category.mods).map((mod, sortOrder) => ({
      ...mod,
      categoryId: category.id,
      sortOrder,
    })),
  }));

  return {
    categories: nextCategories,
    affectedCategories: [...affectedIds].map((categoryId) => {
      const category = nextCategories.find((item) => item.id === categoryId);
      return {
        categoryId,
        modIds: category?.mods.map((mod) => mod.id) ?? [],
      };
    }),
  };
}

export function moveCategoryInList<TCategory extends { id: number; sortOrder: number }>(
  categories: TCategory[],
  categoryId: number,
  beforeCategoryId: number | null,
): CategoryReorderResult<TCategory> {
  const draggedCategory = categories.find((category) => category.id === categoryId);

  if (!draggedCategory) {
    throw new Error(`Category ${categoryId} was not found`);
  }

  if (beforeCategoryId === categoryId) {
    const categoriesWithSort = categories.map((category, sortOrder) => ({ ...category, sortOrder }));
    return {
      categories: categoriesWithSort,
      categoryIds: categoriesWithSort.map((category) => category.id),
    };
  }

  const categoriesWithoutDragged = categories.filter((category) => category.id !== categoryId);
  const insertIndex = beforeCategoryId === null
    ? categoriesWithoutDragged.length
    : categoriesWithoutDragged.findIndex((category) => category.id === beforeCategoryId);

  if (insertIndex < 0) {
    throw new Error(`Drop target category ${beforeCategoryId} was not found`);
  }

  const nextCategories = [
    ...categoriesWithoutDragged.slice(0, insertIndex),
    draggedCategory,
    ...categoriesWithoutDragged.slice(insertIndex),
  ].map((category, sortOrder) => ({ ...category, sortOrder }));

  return {
    categories: nextCategories,
    categoryIds: nextCategories.map((category) => category.id),
  };
}

export function isSameCategoryDropPosition<TCategory extends { id: number }>(
  categories: TCategory[],
  categoryId: number,
  beforeCategoryId: number | null,
) {
  const currentIndex = categories.findIndex((category) => category.id === categoryId);

  if (currentIndex < 0) {
    return true;
  }

  if (beforeCategoryId !== null && !categories.some((category) => category.id === beforeCategoryId)) {
    return true;
  }

  const currentNextCategoryId = categories[currentIndex + 1]?.id ?? null;
  return beforeCategoryId === categoryId || beforeCategoryId === currentNextCategoryId;
}
