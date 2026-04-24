import type { WebSocketServer } from 'ws';

const REALTIME_SERVER_KEY = Symbol.for('modpack-maker.realtime.server');

type GlobalWithRealtime = typeof globalThis & {
  [REALTIME_SERVER_KEY]?: WebSocketServer;
};

function getGlobalRealtimeStore(): GlobalWithRealtime {
  return globalThis as GlobalWithRealtime;
}

export function setRealtimeServer(server: WebSocketServer) {
  getGlobalRealtimeStore()[REALTIME_SERVER_KEY] = server;
}

export function broadcastAppDataUpdated() {
  const wss = getGlobalRealtimeStore()[REALTIME_SERVER_KEY];
  if (!wss) return;

  const payload = JSON.stringify({ type: 'app-data-updated' });

  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}
