import assert from 'node:assert/strict';
import test from 'node:test';
import type { ParsedBoardSortPayload } from './board-sort-payload';
import {
  hasCompleteBoardSortCoverage,
  hasCurrentAlphabeticalBoardSortOrder,
} from './board-sort-snapshot';

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

test('accepts the current alphabetical category and mod order', () => {
  const namedSnapshot = {
    categories: [
      {
        id: 20,
        name: 'World 10',
        mods: [
          { id: 202, name: 'Option 10' },
          { id: 201, name: 'Option 2' },
        ],
      },
      {
        id: 10,
        name: 'world 2',
        mods: [
          { id: 102, name: 'Beta' },
          { id: 101, name: 'alpha' },
        ],
      },
    ],
  };

  assert.equal(hasCurrentAlphabeticalBoardSortOrder(payload({
    categoryIds: [10, 20],
    categories: [
      { categoryId: 20, modIds: [201, 202] },
      { categoryId: 10, modIds: [101, 102] },
    ],
  }), namedSnapshot), true);
});

test('rejects category order computed before a category rename', () => {
  const renamedSnapshot = {
    categories: [
      { id: 1, name: 'Zulu', mods: [] },
      { id: 2, name: 'Alpha', mods: [] },
    ],
  };

  assert.equal(hasCurrentAlphabeticalBoardSortOrder(
    payload({ categoryIds: [1, 2] }),
    renamedSnapshot,
  ), false);
});

test('rejects mod order computed before a mod rename', () => {
  const renamedSnapshot = {
    categories: [{
      id: 1,
      name: 'Utilities',
      mods: [
        { id: 10, name: 'Zulu' },
        { id: 11, name: 'Alpha' },
      ],
    }],
  };

  assert.equal(hasCurrentAlphabeticalBoardSortOrder(payload({
    categories: [{ categoryId: 1, modIds: [10, 11] }],
  }), renamedSnapshot), false);
});

test('validates numeric-aware alphabetical category and mod order', () => {
  const namedSnapshot = {
    categories: [
      {
        id: 1,
        name: 'Group 10',
        mods: [
          { id: 10, name: 'Option 10' },
          { id: 11, name: 'Option 2' },
        ],
      },
      { id: 2, name: 'Group 2', mods: [] },
    ],
  };

  assert.equal(hasCurrentAlphabeticalBoardSortOrder(payload({
    categoryIds: [2, 1],
    categories: [
      { categoryId: 1, modIds: [11, 10] },
      { categoryId: 2, modIds: [] },
    ],
  }), namedSnapshot), true);
  assert.equal(hasCurrentAlphabeticalBoardSortOrder(payload({
    categoryIds: [1, 2],
    categories: [
      { categoryId: 1, modIds: [10, 11] },
      { categoryId: 2, modIds: [] },
    ],
  }), namedSnapshot), false);
});

test('breaks case-insensitive name ties by ID', () => {
  const namedSnapshot = {
    categories: [
      {
        id: 2,
        name: 'ALPHA',
        mods: [
          { id: 12, name: 'Beta' },
          { id: 11, name: 'BETA' },
        ],
      },
      { id: 1, name: 'alpha', mods: [] },
    ],
  };

  assert.equal(hasCurrentAlphabeticalBoardSortOrder(payload({
    categoryIds: [1, 2],
    categories: [
      { categoryId: 1, modIds: [] },
      { categoryId: 2, modIds: [11, 12] },
    ],
  }), namedSnapshot), true);
  assert.equal(hasCurrentAlphabeticalBoardSortOrder(payload({
    categoryIds: [2, 1],
    categories: [
      { categoryId: 2, modIds: [12, 11] },
      { categoryId: 1, modIds: [] },
    ],
  }), namedSnapshot), false);
});

test('ignores category entry order for a mods-only alphabetical sort', () => {
  const namedSnapshot = {
    categories: [
      { id: 1, name: 'First', mods: [{ id: 10, name: 'Alpha' }] },
      { id: 2, name: 'Second', mods: [{ id: 20, name: 'Beta' }] },
    ],
  };

  assert.equal(hasCurrentAlphabeticalBoardSortOrder(payload({
    categories: [
      { categoryId: 2, modIds: [20] },
      { categoryId: 1, modIds: [10] },
    ],
  }), namedSnapshot), true);
});
