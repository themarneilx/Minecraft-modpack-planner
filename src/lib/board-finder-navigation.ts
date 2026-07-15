export type BoardFinderDirection = 'next' | 'previous';

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
