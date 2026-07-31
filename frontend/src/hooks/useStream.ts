'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribe, type StreamMessage, type StreamStatus } from '@/lib/ws';

/**
 * Subscribe a component to a WebSocket path. The handler is kept in a ref so a
 * changing callback identity never reopens the socket.
 */
export function useStream(
  path: string | null,
  onMessage: (msg: StreamMessage) => void,
): StreamStatus {
  const [status, setStatus] = useState<StreamStatus>('closed');
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    if (!path) {
      setStatus('closed');
      return;
    }
    return subscribe(path, (msg) => handlerRef.current(msg), setStatus);
  }, [path]);

  return status;
}
