import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
const DEFAULT_SERVER_PORT = 3000;
const PORT_ERROR_SUFFIX = 'expected a decimal integer from 1 to 65535';

export function loadServerConfig(projectDir, dev) {
  loadEnvConfig(projectDir, dev);

  return {
    hostname: process.env.HOST || '0.0.0.0',
    port: parseServerPort(process.env.PORT),
  };
}

export function parseServerPort(value) {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_SERVER_PORT;
  }

  if (!/^\d+$/.test(value)) {
    throw invalidPortError(value);
  }

  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw invalidPortError(value);
  }

  return port;
}

function invalidPortError(value) {
  return new Error(`Invalid PORT ${JSON.stringify(value)}: ${PORT_ERROR_SUFFIX}`);
}
