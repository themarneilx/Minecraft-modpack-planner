import assert from 'node:assert/strict';
import test from 'node:test';
import { getRemainingInitialLoadingMs, MIN_INITIAL_LOADING_MS } from './loading-screen';

test('keeps the initial loading screen visible for the configured minimum', () => {
  assert.equal(getRemainingInitialLoadingMs(1000, 1400), MIN_INITIAL_LOADING_MS - 400);
});

test('does not delay once the initial loading minimum has already elapsed', () => {
  assert.equal(getRemainingInitialLoadingMs(1000, 1000 + MIN_INITIAL_LOADING_MS + 1), 0);
});
