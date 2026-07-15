import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAppDataPayload, readAppDataResponse } from './app-data';

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

test('reports the HTTP failure when the server returns a non-JSON response', async () => {
  const response = new Response('<html><body>Bad Gateway</body></html>', {
    status: 502,
    statusText: 'Bad Gateway',
    headers: { 'Content-Type': 'text/html' },
  });

  await assert.rejects(
    readAppDataResponse(response),
    /Failed to load modpack data \(HTTP 502 Bad Gateway\): server returned a non-JSON response/i,
  );
});

test('preserves a JSON error returned by the API', async () => {
  const response = Response.json(
    { error: 'The mod_statuses table does not exist' },
    { status: 500 },
  );

  await assert.rejects(
    readAppDataResponse(response),
    /The mod_statuses table does not exist/,
  );
});
