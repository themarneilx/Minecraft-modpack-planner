import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parseServerPort } from './server-port.mjs';

const CHILD_PROCESS_TIMEOUT_MS = 10_000;
const SERVER_STARTUP_TIMEOUT_MS = 20_000;
const projectDir = fileURLToPath(new URL('../../', import.meta.url));
const serverPath = fileURLToPath(new URL('../../server.mjs', import.meta.url));
const serverPortModuleUrl = new URL('./server-port.mjs', import.meta.url).href;

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

test('resolves development files in precedence order per key', () => {
  assert.deepEqual(loadConfigInIsolatedProcess({
    '.env.development.local': 'HOST=development-local-host\n',
    '.env.local': 'PORT=4102\nHOST=local-host\n',
    '.env.development': 'PORT=4103\nHOST=development-host\n',
    '.env': 'PORT=4104\nHOST=base-host\n',
  }, { NODE_ENV: 'development' }), {
    hostname: 'development-local-host',
    port: 4102,
  });
});

test('resolves production files in precedence order per key', () => {
  assert.deepEqual(loadConfigInIsolatedProcess({
    '.env.production.local': 'PORT=4201\n',
    '.env.local': 'PORT=4202\nHOST=production-local-host\n',
    '.env.production': 'PORT=4203\nHOST=production-host\n',
    '.env': 'PORT=4204\nHOST=base-host\n',
  }, { NODE_ENV: 'production' }), {
    hostname: 'production-local-host',
    port: 4201,
  });
});

test('prefers supplied process environment over every env file', () => {
  assert.deepEqual(loadConfigInIsolatedProcess({
    '.env.development.local': 'PORT=4301\nHOST=file-host\n',
    '.env.local': 'PORT=4302\nHOST=local-host\n',
    '.env.development': 'PORT=4303\nHOST=development-host\n',
    '.env': 'PORT=4304\nHOST=base-host\n',
  }, {
    NODE_ENV: 'development',
    PORT: '4305',
    HOST: 'process-host',
  }), {
    hostname: 'process-host',
    port: 4305,
  });
});

test('excludes .env.local in the test environment', () => {
  assert.deepEqual(loadConfigInIsolatedProcess({
    '.env.local': 'PORT=4401\nHOST=excluded-local-host\n',
    '.env.test': 'PORT=4402\nHOST=test-host\n',
    '.env': 'PORT=4403\nHOST=base-host\n',
  }, { NODE_ENV: 'test' }), {
    hostname: 'test-host',
    port: 4402,
  });
});

test('reflects rewritten and removed env file values without caching', () => {
  const childScript = `
    import { rmSync, writeFileSync } from 'node:fs';
    import { join } from 'node:path';
    import { loadServerConfig } from ${JSON.stringify(serverPortModuleUrl)};

    const environment = { NODE_ENV: 'development' };
    const first = loadServerConfig(process.cwd(), environment);
    writeFileSync(join(process.cwd(), '.env'), 'PORT=4502\\nHOST=second-host\\n');
    const second = loadServerConfig(process.cwd(), environment);
    rmSync(join(process.cwd(), '.env'));
    const third = loadServerConfig(process.cwd(), environment);

    process.stdout.write(JSON.stringify({ first, second, third }));
  `;

  assert.deepEqual(runChildInTemporaryProject({
    '.env': 'PORT=4501\nHOST=first-host\n',
  }, childScript, { NODE_ENV: 'development' }), {
    first: { hostname: 'first-host', port: 4501 },
    second: { hostname: 'second-host', port: 4502 },
    third: { hostname: '0.0.0.0', port: 3000 },
  });
});

test('does not mutate supplied or global process environment objects', () => {
  const childScript = `
    import { loadServerConfig } from ${JSON.stringify(serverPortModuleUrl)};

    const environment = {
      NODE_ENV: 'development',
      PORT: '4601',
      HOST: 'supplied-host',
      SUPPLIED_SENTINEL: 'unchanged',
    };
    const suppliedBefore = JSON.stringify(environment);
    const processBefore = JSON.stringify(process.env);
    const config = loadServerConfig(process.cwd(), environment);

    process.stdout.write(JSON.stringify({
      config,
      suppliedUnchanged: JSON.stringify(environment) === suppliedBefore,
      processUnchanged: JSON.stringify(process.env) === processBefore,
      leakedFileValue: process.env.FILE_ONLY_SENTINEL,
    }));
  `;

  assert.deepEqual(runChildInTemporaryProject({
    '.env': 'PORT=4602\nHOST=file-host\nFILE_ONLY_SENTINEL=must-not-leak\n',
  }, childScript, { NODE_ENV: 'development' }), {
    config: { hostname: 'supplied-host', port: 4601 },
    suppliedUnchanged: true,
    processUnchanged: true,
  });
});

test('custom server reaches PORT validation during startup', () => {
  const result = spawnSync(process.execPath, [serverPath], {
    cwd: projectDir,
    env: { ...process.env, NODE_ENV: 'development', PORT: '1.5' },
    encoding: 'utf8',
    timeout: CHILD_PROCESS_TIMEOUT_MS,
  });

  assertChildCompleted(result, 1);
  assert.match(
    result.stderr,
    /Invalid PORT "1\.5": expected a decimal integer from 1 to 65535/,
  );
});

test('custom server starts on a non-default process port', { timeout: 30_000 }, async () => {
  const port = await getAvailablePort();
  assert.notEqual(port, 3000);

  const child = spawn(process.execPath, [serverPath], {
    cwd: projectDir,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  try {
    await waitForChildOutput(
      child,
      `> Server listening at http://127.0.0.1:${port}`,
      () => stderr,
    );

    const response = await fetch(`http://127.0.0.1:${port}/api/data`, {
      signal: AbortSignal.timeout(CHILD_PROCESS_TIMEOUT_MS),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(await response.json()), ['statuses', 'categories', 'packInfo']);
  } finally {
    await stopChild(child);
  }
});

function loadConfigInIsolatedProcess(envFiles, environment) {
  const childScript = `
    import { loadServerConfig } from ${JSON.stringify(serverPortModuleUrl)};
    process.stdout.write(JSON.stringify(
      loadServerConfig(process.cwd(), ${JSON.stringify(environment)})
    ));
  `;

  return runChildInTemporaryProject(
    envFiles,
    childScript,
    { NODE_ENV: environment.NODE_ENV },
  );
}

function runChildInTemporaryProject(envFiles, childScript, environmentOverrides = {}) {
  const temporaryProjectDir = mkdtempSync(join(tmpdir(), 'modpack-maker-server-port-'));

  try {
    for (const [fileName, contents] of Object.entries(envFiles)) {
      writeFileSync(join(temporaryProjectDir, fileName), contents, 'utf8');
    }

    const childEnv = { ...process.env };
    delete childEnv.HOST;
    delete childEnv.PORT;
    delete childEnv.TURBOPACK;
    delete childEnv.__NEXT_PROCESSED_ENV;
    Object.assign(childEnv, environmentOverrides);

    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', childScript],
      {
        cwd: temporaryProjectDir,
        env: childEnv,
        encoding: 'utf8',
        timeout: CHILD_PROCESS_TIMEOUT_MS,
      },
    );

    assertChildCompleted(result, 0);
    return JSON.parse(result.stdout);
  } finally {
    rmSync(temporaryProjectDir, { recursive: true, force: true });
  }
}

function assertChildCompleted(result, expectedStatus) {
  if (result.error) {
    assert.fail(`Child process error (${result.error.code || 'unknown'}): ${result.error.message}`);
  }

  assert.equal(result.signal, null, `Child process terminated by signal ${result.signal}`);
  assert.equal(result.status, expectedStatus, result.stderr);
}

async function getAvailablePort() {
  const probe = createNetServer();

  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });

  const address = probe.address();
  assert.equal(typeof address, 'object');
  const port = address.port;
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port === 3000 ? getAvailablePort() : port;
}

function waitForChildOutput(child, expectedOutput, getStderr) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    const timer = setTimeout(() => {
      finish(reject, new Error(
        `Server startup timed out after ${SERVER_STARTUP_TIMEOUT_MS}ms.\n${getStderr()}`,
      ));
    }, SERVER_STARTUP_TIMEOUT_MS);

    const onData = (chunk) => {
      stdout += chunk;
      if (stdout.includes(expectedOutput)) {
        finish(resolve);
      }
    };
    const onError = (error) => finish(reject, error);
    const onExit = (code, signal) => finish(
      reject,
      new Error(`Server exited before startup (code ${code}, signal ${signal}).\n${getStderr()}`),
    );
    const finish = (callback, value) => {
      clearTimeout(timer);
      child.stdout.off('data', onData);
      child.off('error', onError);
      child.off('exit', onExit);
      callback(value);
    };

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', onData);
    child.once('error', onError);
    child.once('exit', onExit);
  });
}

async function stopChild(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;

  const exitPromise = once(child, 'exit');
  child.kill('SIGTERM');

  let timer;
  try {
    await Promise.race([
      exitPromise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Server did not stop after SIGTERM')), 5_000);
      }),
    ]);
  } catch {
    child.kill('SIGKILL');
    if (child.exitCode === null && child.signalCode === null) {
      await once(child, 'exit');
    }
  } finally {
    clearTimeout(timer);
  }
}
