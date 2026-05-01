import assert from 'node:assert/strict';
import test from 'node:test';
import { getCategoryDropTargetFromPoint, type CategoryDropTargetRect } from './category-drop-target';

function rect(id: number, left: number, top: number, width: number, height: number): CategoryDropTargetRect {
  return {
    id,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

test('targets before a card when the pointer is on its left side', () => {
  const result = getCategoryDropTargetFromPoint(
    [rect(1, 0, 0, 100, 100), rect(2, 120, 0, 100, 100)],
    99,
    { x: 30, y: 40 },
  );

  assert.equal(result, 1);
});

test('targets the next visual card when the pointer is on a card right side', () => {
  const result = getCategoryDropTargetFromPoint(
    [rect(1, 0, 0, 100, 100), rect(2, 120, 0, 100, 100), rect(3, 0, 130, 100, 100)],
    99,
    { x: 80, y: 40 },
  );

  assert.equal(result, 2);
});

test('targets the visual gap between cards', () => {
  const result = getCategoryDropTargetFromPoint(
    [rect(1, 0, 0, 100, 100), rect(2, 140, 0, 100, 100)],
    99,
    { x: 120, y: 50 },
  );

  assert.equal(result, 2);
});

test('ignores the dragged card when computing the drop target', () => {
  const result = getCategoryDropTargetFromPoint(
    [rect(1, 0, 0, 100, 100), rect(2, 120, 0, 100, 100), rect(3, 240, 0, 100, 100)],
    2,
    { x: 150, y: 50 },
  );

  assert.equal(result, 3);
});

test('targets the end after the last visual card', () => {
  const result = getCategoryDropTargetFromPoint(
    [rect(1, 0, 0, 100, 100), rect(2, 120, 0, 100, 100)],
    99,
    { x: 250, y: 50 },
  );

  assert.equal(result, null);
});
