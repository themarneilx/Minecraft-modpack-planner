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
  modIds?: number[];
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

  const requestedIds = [...new Set(drag.modIds?.length ? drag.modIds : [drag.modId])];
  if (!requestedIds.includes(drag.modId)) {
    requestedIds.unshift(drag.modId);
  }

  const requestedIdSet = new Set(requestedIds);
  const draggedMods = categories.flatMap((category) =>
    category.mods.filter((mod) => requestedIdSet.has(mod.id)),
  );

  if (draggedMods.length !== requestedIdSet.size) {
    throw new Error('One or more dragged mods were not found');
  }

  const affectedIds = new Set([
    ...categories
      .filter((category) => category.mods.some((mod) => requestedIdSet.has(mod.id)))
      .map((category) => category.id),
    drop.targetCategoryId,
  ]);
  const modsByCategory = new Map(
    categories.map((category) => [
      category.id,
      category.mods.filter((mod) => !requestedIdSet.has(mod.id)),
    ]),
  );
  const targetMods = modsByCategory.get(drop.targetCategoryId);

  if (!targetMods) {
    throw new Error(`Target category ${drop.targetCategoryId} was not found`);
  }

  const originalTargetMods = targetCategory.mods;
  const normalizedBeforeModId = drop.beforeModId !== null && requestedIdSet.has(drop.beforeModId)
    ? originalTargetMods
        .slice(originalTargetMods.findIndex((mod) => mod.id === drop.beforeModId) + 1)
        .find((mod) => !requestedIdSet.has(mod.id))?.id ?? null
    : drop.beforeModId;
  const insertIndex = normalizedBeforeModId === null
    ? targetMods.length
    : targetMods.findIndex((mod) => mod.id === normalizedBeforeModId);

  if (insertIndex < 0) {
    throw new Error(`Drop target mod ${normalizedBeforeModId} was not found`);
  }

  targetMods.splice(
    insertIndex,
    0,
    ...draggedMods.map((mod) => ({ ...mod, categoryId: drop.targetCategoryId })),
  );
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
