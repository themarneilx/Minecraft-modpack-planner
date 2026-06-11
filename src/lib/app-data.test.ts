import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAppDataPayload } from './app-data';

test('accepts app data payloads with category arrays', () => {
  const payload = {
    statuses: [],
    categories: [],
    packInfo: null,
  };

  assert.deepEqual(parseAppDataPayload(payload), payload);
});

test('rejects error payloads so they cannot be rendered as app data', () => {
  assert.equal(parseAppDataPayload({ error: 'Database failed' }), null);
});
