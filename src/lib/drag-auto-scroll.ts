export interface DragPointer {
  x: number;
  y: number;
}

export interface DragViewport {
  width: number;
  height: number;
}

export interface DragScrollDelta {
  x: number;
  y: number;
}

interface DragAutoScrollOptions {
  edgeSize?: number;
  maxSpeed?: number;
}

function getAxisScrollDelta(position: number, size: number, edgeSize: number, maxSpeed: number) {
  if (size <= 0 || edgeSize <= 0 || maxSpeed <= 0) return 0;

  const edge = Math.min(edgeSize, size / 2);
  if (position < edge) {
    const strength = Math.min(1, Math.max(0, (edge - position) / edge));
    return -maxSpeed * strength * strength;
  }

  if (position > size - edge) {
    const strength = Math.min(1, Math.max(0, (position - (size - edge)) / edge));
    return maxSpeed * strength * strength;
  }

  return 0;
}

export function getDragAutoScrollDelta(
  pointer: DragPointer,
  viewport: DragViewport,
  options: DragAutoScrollOptions = {},
): DragScrollDelta {
  const edgeSize = options.edgeSize ?? 112;
  const maxSpeed = options.maxSpeed ?? 24;

  return {
    x: getAxisScrollDelta(pointer.x, viewport.width, edgeSize, maxSpeed),
    y: getAxisScrollDelta(pointer.y, viewport.height, edgeSize, maxSpeed),
  };
}
