import { Observable } from 'rxjs';

/**
 * Minimal, dependency-free WebSocket → Observable bridge.
 *
 * Derives the ws(s):// origin from the REST base URL, appends the channel
 * path, parses each JSON message to `T`, and cleans the socket up on
 * unsubscribe. Used by the tracking and notification live feeds.
 */
export function socket$<T>(apiBaseUrl: string, channelPath: string): Observable<T> {
  return new Observable<T>((subscriber) => {
    const url = buildWsUrl(apiBaseUrl, channelPath);
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        subscriber.next(JSON.parse(event.data) as T);
      } catch {
        // Ignore non-JSON frames (heartbeats, etc.).
      }
    };
    ws.onerror = () => subscriber.error(new Error(`WebSocket error on ${channelPath}`));
    ws.onclose = () => subscriber.complete();

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  });
}

/** Turn `http(s)://host/api` + `ws/foo` into `ws(s)://host/api/ws/foo`. */
function buildWsUrl(apiBaseUrl: string, channelPath: string): string {
  const base = apiBaseUrl.replace(/^http/, 'ws').replace(/\/+$/, '');
  return `${base}/${channelPath.replace(/^\/+/, '')}`;
}
