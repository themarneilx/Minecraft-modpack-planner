import assert from 'node:assert/strict';
import test from 'node:test';
import { getSearchModalSessionKey, getStatusModalSessionKey } from './modal-session-keys';

test('modal session keys remain unique when counters have the same value', () => {
  assert.notEqual(getSearchModalSessionKey(0), getStatusModalSessionKey(0));
});

test('modal session keys are stable for the same modal and counter', () => {
  assert.equal(getSearchModalSessionKey(2), 'search-2');
  assert.equal(getStatusModalSessionKey(2), 'status-2');
});
