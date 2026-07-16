import type { Category } from './data';

export type BoardSortScope = 'categories' | 'mods' | 'all';

export interface BoardModSearchResult {
  modId: number;
  categoryId: number;
  modName: string;
  categoryName: string;
}

export interface BoardSortPayload {
  categoryIds?: number[];
  categories?: Array<{
    categoryId: number;
    modIds: number[];
  }>;
}

const boardNameCollator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
});

export interface BoardNamedItem {
  id: number;
  name: string;
}

export function compareBoardNamedItems(left: BoardNamedItem, right: BoardNamedItem) {
  return boardNameCollator.compare(left.name, right.name) || left.id - right.id;
}

export function sortBoardAlphabetically(
  categories: Category[],
  scope: BoardSortScope,
): Category[] {
  const shouldSortCategories = scope === 'categories' || scope === 'all';
  const shouldSortMods = scope === 'mods' || scope === 'all';
  const orderedCategories = shouldSortCategories
    ? [...categories].sort(compareBoardNamedItems)
    : [...categories];

  return orderedCategories.map((category, categoryIndex) => {
    const mods = shouldSortMods
      ? [...category.mods]
          .sort(compareBoardNamedItems)
          .map((mod, sortOrder) => ({ ...mod, sortOrder }))
      : category.mods;

    return {
      ...category,
      sortOrder: shouldSortCategories ? categoryIndex : category.sortOrder,
      mods,
    };
  });
}

export function buildBoardSortPayload(
  categories: Category[],
  scope: BoardSortScope,
): BoardSortPayload {
  const payload: BoardSortPayload = {};

  if (scope === 'categories' || scope === 'all') {
    payload.categoryIds = categories.map((category) => category.id);
  }

  if (scope === 'mods' || scope === 'all') {
    payload.categories = categories.map((category) => ({
      categoryId: category.id,
      modIds: category.mods.filter((mod) => mod.id > 0).map((mod) => mod.id),
    }));
  }

  return payload;
}

export function searchBoardMods(
  categories: Category[],
  query: string,
  limit = 8,
): BoardModSearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('en');

  if (!normalizedQuery) {
    return [];
  }

  return categories
    .flatMap((category) =>
      category.mods
        .filter((mod) => mod.name.toLocaleLowerCase('en').includes(normalizedQuery))
        .map((mod) => ({
          modId: mod.id,
          categoryId: category.id,
          modName: mod.name,
          categoryName: category.name,
        })),
    )
    .sort((left, right) =>
      boardNameCollator.compare(left.modName, right.modName)
      || boardNameCollator.compare(left.categoryName, right.categoryName)
      || left.modId - right.modId,
    )
    .slice(0, Math.max(0, limit));
}
