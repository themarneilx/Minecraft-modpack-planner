import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRealtimeClientId, parseAppDataUpdatedMessage } from './realtime-protocol';

test('accepts a server update with a valid source client', () => {
  assert.deepEqual(
    parseAppDataUpdatedMessage({
      type: 'app-data-updated',
      updatedAt: '2026-07-16T04:00:00.000Z',
      sourceClientId: 'client-12345678',
    }),
    {
      type: 'app-data-updated',
      updatedAt: '2026-07-16T04:00:00.000Z',
      sourceClientId: 'client-12345678',
    },
  );
});

test('rejects malformed realtime messages and unsafe client ids', () => {
  assert.equal(parseAppDataUpdatedMessage({ type: 'connected' }), null);
  assert.equal(normalizeRealtimeClientId('bad id'), null);
});
