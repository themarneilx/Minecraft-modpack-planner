import type { BoardCategoryOrder, ParsedBoardSortPayload } from './board-sort-payload';
import {
  compareBoardNamedItems,
  type BoardNamedItem,
} from './board-tools';

export interface BoardSortSnapshot {
  categoryIds: number[];
  categories: BoardCategoryOrder[];
}

export interface NamedBoardSortSnapshot {
  categories: Array<BoardNamedItem & {
    mods: BoardNamedItem[];
  }>;
}

function hasSameIds(left: number[], right: number[]) {
  if (left.length !== right.length) return false;

  const rightIds = new Set(right);
  return left.every((id) => rightIds.has(id));
}

function hasSameOrder(left: number[], right: number[]) {
  return left.length === right.length
    && left.every((id, index) => id === right[index]);
}

export function hasCompleteBoardSortCoverage(
  payload: ParsedBoardSortPayload,
  snapshot: BoardSortSnapshot,
) {
  if (payload.categoryIds && !hasSameIds(payload.categoryIds, snapshot.categoryIds)) {
    return false;
  }

  if (payload.categories) {
    if (!hasSameIds(
      payload.categories.map((category) => category.categoryId),
      snapshot.categoryIds,
    )) {
      return false;
    }

    const snapshotModsByCategory = new Map(
      snapshot.categories.map((category) => [category.categoryId, category.modIds]),
    );

    for (const category of payload.categories) {
      const snapshotModIds = snapshotModsByCategory.get(category.categoryId);
      if (!snapshotModIds || !hasSameIds(category.modIds, snapshotModIds)) {
        return false;
      }
    }
  }

  return payload.categoryIds !== null || payload.categories !== null;
}

export function hasCurrentAlphabeticalBoardSortOrder(
  payload: ParsedBoardSortPayload,
  snapshot: NamedBoardSortSnapshot,
) {
  if (!hasCompleteBoardSortCoverage(payload, {
    categoryIds: snapshot.categories.map((category) => category.id),
    categories: snapshot.categories.map((category) => ({
      categoryId: category.id,
      modIds: category.mods.map((mod) => mod.id),
    })),
  })) {
    return false;
  }

  if (payload.categoryIds) {
    const alphabeticalCategoryIds = [...snapshot.categories]
      .sort(compareBoardNamedItems)
      .map((category) => category.id);

    if (!hasSameOrder(payload.categoryIds, alphabeticalCategoryIds)) {
      return false;
    }
  }

  if (payload.categories) {
    const categoriesById = new Map(
      snapshot.categories.map((category) => [category.id, category]),
    );

    for (const categoryOrder of payload.categories) {
      const category = categoriesById.get(categoryOrder.categoryId);
      const alphabeticalModIds = [...(category?.mods ?? [])]
        .sort(compareBoardNamedItems)
        .map((mod) => mod.id);

      if (!hasSameOrder(categoryOrder.modIds, alphabeticalModIds)) {
        return false;
      }
    }
  }

  return true;
}
