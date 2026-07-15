import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOARD_SORT_OPTIONS,
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
