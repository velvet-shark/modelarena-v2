"use client";

import { useState, useEffect } from "react";

interface JobStreamData {
  stats: {
    pending: number;
    active: number;
    completed: number;
    failed: number;
  };
  jobs: any[];
  timestamp: string;
}

export function useJobStream(enabled: boolean = true) {
  const [data, setData] = useState<JobStreamData | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let eventSource: EventSource | null = null;

    const connect = () => {
      eventSource = new EventSource("/api/jobs/stream");

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setData(data);
        } catch (error) {
          console.error("Failed to parse SSE data:", error);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource?.close();

        // Reconnect after 5 seconds
        setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
    };
  }, [enabled]);

  return { data, connected };
}
