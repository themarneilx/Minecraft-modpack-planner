export interface BoardCategoryOrder {
  categoryId: number;
  modIds: number[];
}

export interface ParsedBoardSortPayload {
  categoryIds: number[] | null;
  categories: BoardCategoryOrder[] | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= 2_147_483_647;
}

export function parseBoardSortPayload(value: unknown): ParsedBoardSortPayload | null {
  if (!isObject(value)) {
    return null;
  }

  const hasCategoryIds = Object.hasOwn(value, 'categoryIds');
  const hasCategories = Object.hasOwn(value, 'categories');

  if (!hasCategoryIds && !hasCategories) {
    return null;
  }

  let categoryIds: number[] | null = null;

  if (hasCategoryIds) {
    if (!Array.isArray(value.categoryIds) || value.categoryIds.length === 0) {
      return null;
    }

    const seenCategoryIds = new Set<number>();
    categoryIds = [];

    for (const categoryId of value.categoryIds) {
      if (!isPositiveInteger(categoryId) || seenCategoryIds.has(categoryId)) {
        return null;
      }

      seenCategoryIds.add(categoryId);
      categoryIds.push(categoryId);
    }
  }

  let categories: BoardCategoryOrder[] | null = null;

  if (hasCategories) {
    if (!Array.isArray(value.categories) || value.categories.length === 0) {
      return null;
    }

    const seenCategoryIds = new Set<number>();
    const seenModIds = new Set<number>();
    categories = [];

    for (const category of value.categories) {
      if (!isObject(category) || !isPositiveInteger(category.categoryId) || !Array.isArray(category.modIds)) {
        return null;
      }

      if (seenCategoryIds.has(category.categoryId)) {
        return null;
      }

      seenCategoryIds.add(category.categoryId);
      const modIds: number[] = [];

      for (const modId of category.modIds) {
        if (!isPositiveInteger(modId) || seenModIds.has(modId)) {
          return null;
        }

        seenModIds.add(modId);
        modIds.push(modId);
      }

      categories.push({ categoryId: category.categoryId, modIds });
    }
  }

  return { categoryIds, categories };
}
