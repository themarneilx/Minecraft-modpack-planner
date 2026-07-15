import assert from 'node:assert/strict';
import test from 'node:test';
import type { ParsedBoardSortPayload } from './board-sort-payload';
import { hasCompleteBoardSortCoverage } from './board-sort-snapshot';

const snapshot = {
  categoryIds: [1, 2],
  categories: [
    { categoryId: 1, modIds: [10, 11] },
    { categoryId: 2, modIds: [20] },
  ],
};

function payload(value: Partial<ParsedBoardSortPayload>): ParsedBoardSortPayload {
  return {
    categoryIds: value.categoryIds ?? null,
    categories: value.categories ?? null,
  };
}

test('accepts a complete category snapshot regardless of requested order', () => {
  assert.equal(hasCompleteBoardSortCoverage(payload({ categoryIds: [2, 1] }), snapshot), true);
});

test('rejects missing and extra categories in a category order', () => {
  assert.equal(hasCompleteBoardSortCoverage(payload({ categoryIds: [1] }), snapshot), false);
  assert.equal(hasCompleteBoardSortCoverage(payload({ categoryIds: [1, 2, 3] }), snapshot), false);
});

test('accepts complete mod coverage for every category regardless of requested order', () => {
  assert.equal(hasCompleteBoardSortCoverage(payload({
    categories: [
      { categoryId: 2, modIds: [20] },
      { categoryId: 1, modIds: [11, 10] },
    ],
  }), snapshot), true);
});

test('rejects missing and extra categories in mod orders', () => {
  assert.equal(hasCompleteBoardSortCoverage(payload({
    categories: [{ categoryId: 1, modIds: [10, 11] }],
  }), snapshot), false);
  assert.equal(hasCompleteBoardSortCoverage(payload({
    categories: [
      { categoryId: 1, modIds: [10, 11] },
      { categoryId: 2, modIds: [20] },
      { categoryId: 3, modIds: [] },
    ],
  }), snapshot), false);
});

test('rejects missing, extra, and moved mods', () => {
  assert.equal(hasCompleteBoardSortCoverage(payload({
    categories: [
      { categoryId: 1, modIds: [10] },
      { categoryId: 2, modIds: [20] },
    ],
  }), snapshot), false);
  assert.equal(hasCompleteBoardSortCoverage(payload({
    categories: [
      { categoryId: 1, modIds: [10, 11, 12] },
      { categoryId: 2, modIds: [20] },
    ],
  }), snapshot), false);
  assert.equal(hasCompleteBoardSortCoverage(payload({
    categories: [
      { categoryId: 1, modIds: [10] },
      { categoryId: 2, modIds: [20, 11] },
    ],
  }), snapshot), false);
});

test('requires both snapshots to be complete for a combined sort', () => {
  assert.equal(hasCompleteBoardSortCoverage(payload({
    categoryIds: [2, 1],
    categories: [
      { categoryId: 1, modIds: [11, 10] },
      { categoryId: 2, modIds: [20] },
    ],
  }), snapshot), true);
  assert.equal(hasCompleteBoardSortCoverage(payload({
    categoryIds: [1],
    categories: [
      { categoryId: 1, modIds: [10, 11] },
      { categoryId: 2, modIds: [20] },
    ],
  }), snapshot), false);
});
