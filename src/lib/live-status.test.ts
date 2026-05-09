import assert from 'node:assert/strict';
import test from 'node:test';
import { formatLastUpdatedAt } from './live-status';

test('formats last update with date and time', () => {
  assert.equal(
    formatLastUpdatedAt('2026-05-09T15:42:05.000Z', 'en-US', 'UTC'),
    'May 9, 2026, 3:42:05 PM',
  );
});

test('returns fallback for missing or invalid timestamps', () => {
  assert.equal(formatLastUpdatedAt(null), 'No updates yet');
  assert.equal(formatLastUpdatedAt('not-a-date'), 'No updates yet');
});
