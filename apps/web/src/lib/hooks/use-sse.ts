"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SSEOptions {
  onOpen?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface SSEState<T> {
  data: T | null;
  isConnected: boolean;
  error: string | null;
  reconnectCount: number;
}

export function useSSE<T = unknown>(
  url: string | null,
  options: SSEOptions = {}
): SSEState<T> {
  const {
    onOpen,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  const [state, setState] = useState<SSEState<T>>({
    data: null,
    isConnected: false,
    error: null,
    reconnectCount: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCountRef = useRef(0);

  const connect = useCallback(() => {
    if (!url) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      reconnectCountRef.current = 0;
      setState((prev) => ({
        ...prev,
        isConnected: true,
        error: null,
        reconnectCount: 0,
      }));
      onOpen?.();
    };

    eventSource.onerror = (event) => {
      eventSource.close();
      eventSourceRef.current = null;

      const shouldReconnect = reconnectCountRef.current < reconnectAttempts;

      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: shouldReconnect
          ? `Connection lost. Reconnecting... (${reconnectCountRef.current + 1}/${reconnectAttempts})`
          : "Connection failed. Max reconnection attempts reached.",
        reconnectCount: reconnectCountRef.current,
      }));

      onError?.(event);

      if (shouldReconnect) {
        reconnectCountRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as T;
        setState((prev) => ({
          ...prev,
          data: parsed,
          error: null,
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          error: "Failed to parse SSE message",
        }));
      }
    };
  }, [url, onOpen, onError, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    reconnectCountRef.current = 0;

    setState((prev) => ({
      ...prev,
      isConnected: false,
      reconnectCount: 0,
    }));
  }, []);

  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  return state;
}

export function useTypedSSE<T extends { type: string }>(
  url: string | null,
  options: SSEOptions & { maxHistory?: number } = {}
) {
  const { maxHistory = 500, ...sseOptions } = options;
  const [events, setEvents] = useState<T[]>([]);
  const [lastEvent, setLastEvent] = useState<T | null>(null);

  const { data, isConnected, error, reconnectCount } = useSSE<T>(url, {
    ...sseOptions,
    onOpen: () => {
      setEvents([]);
      setLastEvent(null);
      sseOptions.onOpen?.();
    },
  });

  useEffect(() => {
    if (data) {
      setLastEvent(data);
      setEvents((prev) => {
        const next = [...prev, data];
        return next.length > maxHistory ? next.slice(-maxHistory) : next;
      });
    }
  }, [data, maxHistory]);

  return {
    lastEvent,
    events,
    isConnected,
    error,
    reconnectCount,
  };
}
