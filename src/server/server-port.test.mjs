import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseServerPort } from './server-port.mjs';

const projectDir = fileURLToPath(new URL('../../', import.meta.url));
const serverPath = fileURLToPath(new URL('../../server.mjs', import.meta.url));

test('defaults to port 3000 when PORT is missing or blank', () => {
  assert.equal(parseServerPort(undefined), 3000);
  assert.equal(parseServerPort(''), 3000);
  assert.equal(parseServerPort('   '), 3000);
});

test('parses decimal digit strings within the TCP port range', () => {
  assert.equal(parseServerPort('1'), 1);
  assert.equal(parseServerPort('3000'), 3000);
  assert.equal(parseServerPort('065535'), 65535);
});

test('rejects non-integer PORT syntax with a clear startup error', () => {
  for (const value of ['1.5', '-1', '+3000', '1e3', '0x10', '3000abc', ' 3000 ']) {
    assert.throws(
      () => parseServerPort(value),
      /Invalid PORT .* expected a decimal integer from 1 to 65535/,
    );
  }
});

test('rejects PORT values outside the TCP port range', () => {
  for (const value of ['0', '65536', '99999']) {
    assert.throws(
      () => parseServerPort(value),
      /Invalid PORT .* expected a decimal integer from 1 to 65535/,
    );
  }
});

test('rejects unsafe integer PORT values', () => {
  assert.throws(
    () => parseServerPort('9007199254740993'),
    /Invalid PORT .* expected a decimal integer from 1 to 65535/,
  );
});

test('custom server reaches PORT validation during startup', () => {
  const result = spawnSync(process.execPath, [serverPath], {
    cwd: projectDir,
    env: { ...process.env, NODE_ENV: 'development', PORT: '1.5' },
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Invalid PORT "1\.5": expected a decimal integer from 1 to 65535/,
  );
});
