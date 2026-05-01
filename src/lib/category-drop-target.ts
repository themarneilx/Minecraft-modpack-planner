export interface CategoryDropTargetRect {
  id: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface PointerPoint {
  x: number;
  y: number;
}

interface Candidate {
  beforeCategoryId: number | null;
  score: number;
}

export function getCategoryDropTargetFromPoint(
  rects: CategoryDropTargetRect[],
  draggingCategoryId: number,
  point: PointerPoint,
) {
  const visualRects = rects
    .filter((rect) => rect.id !== draggingCategoryId)
    .toSorted((a, b) => (a.top - b.top) || (a.left - b.left));

  if (visualRects.length === 0) {
    return null;
  }

  const containingIndex = visualRects.findIndex((rect) => (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  ));

  if (containingIndex >= 0) {
    const rect = visualRects[containingIndex];
    return point.x < rect.left + rect.width / 2
      ? rect.id
      : visualRects[containingIndex + 1]?.id ?? null;
  }

  const candidates = visualRects.flatMap<Candidate>((rect, index) => {
    const nextCategoryId = visualRects[index + 1]?.id ?? null;

    return [
      {
        beforeCategoryId: rect.id,
        score: boundaryDistanceScore(point, rect.left, rect),
      },
      {
        beforeCategoryId: nextCategoryId,
        score: boundaryDistanceScore(point, rect.right, rect),
      },
    ];
  });

  return candidates.reduce((best, candidate) => (
    candidate.score < best.score ? candidate : best
  )).beforeCategoryId;
}

function boundaryDistanceScore(point: PointerPoint, boundaryX: number, rect: CategoryDropTargetRect) {
  const verticalDistance = point.y < rect.top
    ? rect.top - point.y
    : point.y > rect.bottom
      ? point.y - rect.bottom
      : 0;
  const horizontalDistance = point.x - boundaryX;

  return horizontalDistance ** 2 + verticalDistance ** 2;
}
