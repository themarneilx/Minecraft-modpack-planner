import type { BoardCategoryOrder, ParsedBoardSortPayload } from './board-sort-payload';

export interface BoardSortSnapshot {
  categoryIds: number[];
  categories: BoardCategoryOrder[];
}

function hasSameIds(left: number[], right: number[]) {
  if (left.length !== right.length) return false;

  const rightIds = new Set(right);
  return left.every((id) => rightIds.has(id));
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
