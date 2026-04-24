import { createServer } from 'http';
import next from 'next';
import { WebSocketServer } from 'ws';

const REALTIME_SERVER_KEY = Symbol.for('modpack-maker.realtime.server');
const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const server = createServer((req, res) => {
    void handle(req, res);
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'connected' }));
  });

  globalThis[REALTIME_SERVER_KEY] = wss;

  server.listen(port, hostname, () => {
    console.log(`> Server listening at http://${hostname}:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
