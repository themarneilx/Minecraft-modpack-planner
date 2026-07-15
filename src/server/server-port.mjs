import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';

const { parse } = dotenv;
const DEFAULT_SERVER_PORT = 3000;
const PORT_ERROR_SUFFIX = 'expected a decimal integer from 1 to 65535';

export function loadServerConfig(projectDir, environment = process.env) {
  const resolved = {
    HOST: environment.HOST,
    PORT: environment.PORT,
  };

  for (const fileName of getEnvFileNames(environment.NODE_ENV)) {
    const fileEnvironment = readEnvFile(join(projectDir, fileName));

    if (resolved.HOST === undefined && Object.hasOwn(fileEnvironment, 'HOST')) {
      resolved.HOST = fileEnvironment.HOST;
    }
    if (resolved.PORT === undefined && Object.hasOwn(fileEnvironment, 'PORT')) {
      resolved.PORT = fileEnvironment.PORT;
    }
  }

  return {
    hostname: resolved.HOST || '0.0.0.0',
    port: parseServerPort(resolved.PORT),
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

function getEnvFileNames(nodeEnv) {
  return [
    nodeEnv && `.env.${nodeEnv}.local`,
    nodeEnv !== 'test' && '.env.local',
    nodeEnv && `.env.${nodeEnv}`,
    '.env',
  ].filter(Boolean);
}

function readEnvFile(filePath) {
  try {
    return parse(readFileSync(filePath));
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }
}
