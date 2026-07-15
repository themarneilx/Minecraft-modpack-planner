import assert from 'node:assert/strict';
import test from 'node:test';
import { getDragAutoScrollDelta } from './drag-auto-scroll';

test('does not scroll while the drag pointer is away from viewport edges', () => {
  assert.deepEqual(
    getDragAutoScrollDelta({ x: 500, y: 400 }, { width: 1000, height: 800 }),
    { x: 0, y: 0 },
  );
});

test('scrolls toward the nearest viewport edge', () => {
  const topLeft = getDragAutoScrollDelta(
    { x: 0, y: 0 },
    { width: 1000, height: 800 },
    { edgeSize: 100, maxSpeed: 20 },
  );
  const bottomRight = getDragAutoScrollDelta(
    { x: 1000, y: 800 },
    { width: 1000, height: 800 },
    { edgeSize: 100, maxSpeed: 20 },
  );

  assert.deepEqual(topLeft, { x: -20, y: -20 });
  assert.deepEqual(bottomRight, { x: 20, y: 20 });
});

test('accelerates smoothly as the pointer approaches an edge', () => {
  const nearEdge = getDragAutoScrollDelta(
    { x: 500, y: 90 },
    { width: 1000, height: 800 },
    { edgeSize: 100, maxSpeed: 20 },
  );
  const atEdge = getDragAutoScrollDelta(
    { x: 500, y: 0 },
    { width: 1000, height: 800 },
    { edgeSize: 100, maxSpeed: 20 },
  );

  assert.ok(nearEdge.y < 0);
  assert.ok(Math.abs(nearEdge.y) < Math.abs(atEdge.y));
});
