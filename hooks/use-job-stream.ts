"use client";

import { useState, useEffect } from "react";
import type { JobStats, JobSummary } from "@/src/lib/queue/monitor";

interface JobStreamData {
  stats: JobStats;
  jobs: JobSummary[];
  workers: number;
  timestamp: string;
}

export function useJobStream(enabled: boolean = true) {
  const [data, setData] = useState<JobStreamData | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      eventSource = new EventSource("/api/jobs/stream");

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          setData(JSON.parse(event.data));
        } catch (error) {
          console.error("Failed to parse SSE data:", error);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource?.close();

        // Reconnect after 5 seconds, unless the hook was turned off or unmounted
        if (!cancelled) reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      eventSource?.close();
      setConnected(false);
    };
  }, [enabled]);

  return { data, connected };
}
