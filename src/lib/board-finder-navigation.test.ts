import assert from 'node:assert/strict';
import test from 'node:test';
import { getNextBoardFinderIndex } from './board-finder-navigation';

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

test('returns no active index when there are no results', () => {
  assert.equal(getNextBoardFinderIndex(0, 'next', 0), -1);
  assert.equal(getNextBoardFinderIndex(0, 'previous', 0), -1);
});
