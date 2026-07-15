export type BoardFinderDirection = 'next' | 'previous';

export interface BoardFinderResultIdentity {
  categoryId: number;
  modId: number;
}

export function isBoardFinderQueryCurrent(query: string, deferredQuery: string): boolean {
  return query === deferredQuery;
}

export function getBoardFinderResultIdentity(result: BoardFinderResultIdentity): string {
  return `${result.categoryId}:${result.modId}`;
}

export function resolveBoardFinderActiveIndex(
  results: readonly BoardFinderResultIdentity[],
  activeIdentity: string | null,
): number {
  if (results.length === 0 || activeIdentity === null) {
    return -1;
  }

  const activeIndex = results.findIndex(
    (result) => getBoardFinderResultIdentity(result) === activeIdentity,
  );
  return activeIndex >= 0 ? activeIndex : 0;
}

export function getNextBoardFinderIndex(
  currentIndex: number,
  direction: BoardFinderDirection,
  resultCount: number,
): number {
  if (resultCount <= 0) {
    return -1;
  }

  if (currentIndex < 0 || currentIndex >= resultCount) {
    return direction === 'next' ? 0 : resultCount - 1;
  }

  const offset = direction === 'next' ? 1 : -1;
  return (currentIndex + offset + resultCount) % resultCount;
}
