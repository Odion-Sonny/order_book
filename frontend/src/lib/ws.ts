/**
 * Single reconnecting WebSocket per URL, shared by every subscriber.
 *
 * Backend contract (`order_book/routing.py`):
 *   ws/stream/               -> { type: 'bar' | 'trade', data: {...} }
 *   ws/orderbook/<ticker>/   -> { type: 'orderbook_update', data: {...} }
 *   ws/market-data/          -> { type: 'market_update', data: {...} }
 */

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';

export type StreamStatus = 'connecting' | 'open' | 'closed';

export interface StreamMessage<T = unknown> {
  type: string;
  data: T;
}

type MessageHandler = (msg: StreamMessage) => void;
type StatusHandler = (status: StreamStatus) => void;

interface Channel {
  socket: WebSocket | null;
  status: StreamStatus;
  messageHandlers: Set<MessageHandler>;
  statusHandlers: Set<StatusHandler>;
  retries: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
}

const channels = new Map<string, Channel>();

const MAX_BACKOFF_MS = 15_000;

function backoff(retries: number): number {
  return Math.min(1000 * 2 ** retries, MAX_BACKOFF_MS);
}

function setStatus(channel: Channel, status: StreamStatus): void {
  channel.status = status;
  channel.statusHandlers.forEach((h) => h(status));
}

function connect(path: string, channel: Channel): void {
  if (typeof window === 'undefined') return;

  setStatus(channel, 'connecting');
  const socket = new WebSocket(`${WS_URL}/${path.replace(/^\/+/, '')}`);
  channel.socket = socket;

  socket.onopen = () => {
    channel.retries = 0;
    setStatus(channel, 'open');
  };

  socket.onmessage = (event) => {
    let payload: StreamMessage;
    try {
      payload = JSON.parse(event.data as string) as StreamMessage;
    } catch {
      return;
    }
    channel.messageHandlers.forEach((h) => h(payload));
  };

  socket.onclose = () => {
    channel.socket = null;
    setStatus(channel, 'closed');
    // Only retry while somebody is still listening.
    if (channel.messageHandlers.size === 0 && channel.statusHandlers.size === 0) return;
    channel.retryTimer = setTimeout(() => connect(path, channel), backoff(channel.retries++));
  };

  socket.onerror = () => socket.close();
}

function ensureChannel(path: string): Channel {
  let channel = channels.get(path);
  if (!channel) {
    channel = {
      socket: null,
      status: 'closed',
      messageHandlers: new Set(),
      statusHandlers: new Set(),
      retries: 0,
      retryTimer: null,
    };
    channels.set(path, channel);
  }
  if (!channel.socket && channel.status !== 'connecting') connect(path, channel);
  return channel;
}

function teardown(path: string, channel: Channel): void {
  if (channel.messageHandlers.size > 0 || channel.statusHandlers.size > 0) return;
  if (channel.retryTimer) clearTimeout(channel.retryTimer);
  channel.retryTimer = null;
  channel.socket?.close();
  channel.socket = null;
  channels.delete(path);
}

/** Subscribe to a stream path. Returns an unsubscribe function. */
export function subscribe(
  path: string,
  onMessage: MessageHandler,
  onStatus?: StatusHandler,
): () => void {
  const channel = ensureChannel(path);
  channel.messageHandlers.add(onMessage);
  if (onStatus) {
    channel.statusHandlers.add(onStatus);
    onStatus(channel.status);
  }

  return () => {
    channel.messageHandlers.delete(onMessage);
    if (onStatus) channel.statusHandlers.delete(onStatus);
    teardown(path, channel);
  };
}

export function send(path: string, payload: unknown): boolean {
  const channel = channels.get(path);
  if (!channel?.socket || channel.socket.readyState !== WebSocket.OPEN) return false;
  channel.socket.send(JSON.stringify(payload));
  return true;
}
