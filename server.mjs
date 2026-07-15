import { createServer } from 'http';
import next from 'next';
import { WebSocketServer } from 'ws';
import {
  loadServerConfig,
  synchronizeServerEnvironmentSnapshot,
} from './src/server/server-port.mjs';

const REALTIME_SERVER_KEY = Symbol.for('modpack-maker.realtime.server');
const dev = process.env.NODE_ENV !== 'production';
const { hostname, port } = loadServerConfig(process.cwd(), dev);

async function main() {
  let handleRequest = null;

  const server = createServer((req, res) => {
    if (!handleRequest) {
      res.statusCode = 503;
      res.end('Server is still starting');
      return;
    }

    void handleRequest(req, res);
  });

  const app = next({ dev, hostname, port });
  synchronizeServerEnvironmentSnapshot();
  await app.prepare();

  handleRequest = app.getRequestHandler();
  const handleUpgrade = app.getUpgradeHandler();

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'connected' }));
  });

  globalThis[REALTIME_SERVER_KEY] = wss;

  server.on('upgrade', async (req, socket, head) => {
    const pathname = req.url ? new URL(req.url, `http://${req.headers.host || hostname}`).pathname : '';

    try {
      if (pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (client) => {
          wss.emit('connection', client, req);
        });
        return;
      }

      await handleUpgrade(req, socket, head);
    } catch (error) {
      console.error('Upgrade handling failed', error);
      socket.destroy();
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Server listening at http://${hostname}:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
