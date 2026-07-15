import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOARD_SORT_OPTIONS,
  canStartBoardSort,
  getBoardSortControlLabel,
  getBoardSortStatus,
  parseBoardSortSelection,
} from './board-sort-ui';

test('exposes the three alphabetical board sort actions in UI order', () => {
  assert.deepEqual(BOARD_SORT_OPTIONS, [
    { value: 'categories', label: 'Categories A-Z' },
    { value: 'mods', label: 'Mods A-Z in every category' },
    { value: 'all', label: 'Everything A-Z' },
  ]);
});

test('accepts only actionable sort selections', () => {
  assert.equal(parseBoardSortSelection('categories'), 'categories');
  assert.equal(parseBoardSortSelection('mods'), 'mods');
  assert.equal(parseBoardSortSelection('all'), 'all');
  assert.equal(parseBoardSortSelection(''), null);
  assert.equal(parseBoardSortSelection('alphabetical'), null);
});

test('describes each completed sort for assistive technology', () => {
  assert.equal(getBoardSortStatus('categories'), 'Categories sorted A-Z and saved.');
  assert.equal(getBoardSortStatus('mods'), 'Mods sorted A-Z in every category and saved.');
  assert.equal(getBoardSortStatus('all'), 'Categories and mods sorted A-Z and saved.');
});

test('starts a sort only for a non-empty idle board', () => {
  assert.equal(canStartBoardSort(1, false), true);
  assert.equal(canStartBoardSort(0, false), false);
  assert.equal(canStartBoardSort(1, true), false);
});

test('labels dedicated sorting separately from unrelated syncing', () => {
  assert.equal(getBoardSortControlLabel(false, false), 'Sort A-Z');
  assert.equal(getBoardSortControlLabel(false, true), 'Syncing...');
  assert.equal(getBoardSortControlLabel(true, true), 'Sorting...');
});
