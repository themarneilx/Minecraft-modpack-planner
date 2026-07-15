import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getBoardFinderResultIdentity,
  getNextBoardFinderIndex,
  isBoardFinderQueryCurrent,
  resolveBoardFinderActiveIndex,
} from './board-finder-navigation';

const firstResult = { categoryId: 10, modId: 101 };
const secondResult = { categoryId: 20, modId: 202 };

test('uses search results only when the deferred query matches the current query', () => {
  assert.equal(isBoardFinderQueryCurrent('draw', 'draw'), true);
  assert.equal(isBoardFinderQueryCurrent('drawers', 'draw'), false);
});

test('resolves an active result by stable identity after result order changes', () => {
  const activeIdentity = getBoardFinderResultIdentity(firstResult);

  assert.equal(
    resolveBoardFinderActiveIndex([secondResult, firstResult], activeIdentity),
    1,
  );
});

test('falls back to the first result when the active identity disappears', () => {
  const missingIdentity = getBoardFinderResultIdentity(firstResult);

  assert.equal(resolveBoardFinderActiveIndex([secondResult], missingIdentity), 0);
});

test('keeps results inactive without an identity or available results', () => {
  assert.equal(resolveBoardFinderActiveIndex([firstResult], null), -1);
  assert.equal(
    resolveBoardFinderActiveIndex([], getBoardFinderResultIdentity(firstResult)),
    -1,
  );
});

test('moves forward through results and wraps to the first result', () => {
  assert.equal(getNextBoardFinderIndex(0, 'next', 3), 1);
  assert.equal(getNextBoardFinderIndex(2, 'next', 3), 0);
});

test('moves backward through results and wraps to the last result', () => {
  assert.equal(getNextBoardFinderIndex(2, 'previous', 3), 1);
  assert.equal(getNextBoardFinderIndex(0, 'previous', 3), 2);
});

test('starts at the directional edge when no result is active', () => {
  assert.equal(getNextBoardFinderIndex(-1, 'next', 3), 0);
  assert.equal(getNextBoardFinderIndex(-1, 'previous', 3), 2);
});

test('normalizes out-of-range active indexes to the directional edge', () => {
  assert.equal(getNextBoardFinderIndex(10, 'next', 3), 0);
  assert.equal(getNextBoardFinderIndex(10, 'previous', 3), 2);
  assert.equal(getNextBoardFinderIndex(-10, 'next', 3), 0);
  assert.equal(getNextBoardFinderIndex(-10, 'previous', 3), 2);
});

test('returns no active index when there are no results', () => {
  assert.equal(getNextBoardFinderIndex(0, 'next', 0), -1);
  assert.equal(getNextBoardFinderIndex(0, 'previous', 0), -1);
});
