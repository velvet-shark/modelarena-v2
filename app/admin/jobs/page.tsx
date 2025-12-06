"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJobStream } from "@/hooks/use-job-stream";

interface Job {
  id: string;
  type: string;
  status: string;
  payload: any;
  result: any;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  videoId: string | null;
  comparisonId: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export default function JobsPage() {
  const [filter, setFilter] = useState<string>("all");
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const { data, connected } = useJobStream(realtimeEnabled);

  const jobs = useMemo(() => {
    if (!data?.jobs) return [];
    if (filter === "all") return data.jobs;
    return data.jobs.filter((job: Job) => job.status === filter);
  }, [data, filter]);

  const stats = data?.stats || {
    pending: 0,
    active: 0,
    completed: 0,
    failed: 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString();
  };

  const getDuration = (job: Job) => {
    if (!job.startedAt) return "-";
    const end = job.completedAt ? new Date(job.completedAt) : new Date();
    const start = new Date(job.startedAt);
    const seconds = ((end.getTime() - start.getTime()) / 1000).toFixed(1);
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Queue Monitor</h1>
          <p className="text-muted-foreground mt-1">
            Real-time video generation job queue monitoring
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
            title={connected ? "Connected" : "Disconnected"}
          />
          <span className="text-sm text-muted-foreground">
            {connected ? "Live" : "Offline"}
          </span>
          <Button
            variant={realtimeEnabled ? "default" : "outline"}
            onClick={() => setRealtimeEnabled(!realtimeEnabled)}
          >
            {realtimeEnabled ? "Real-time: ON" : "Real-time: OFF"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Pending</div>
          <div className="text-2xl font-bold">{stats.pending}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold">{stats.active}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Completed</div>
          <div className="text-2xl font-bold">{stats.completed}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Failed</div>
          <div className="text-2xl font-bold">{stats.failed}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filter:</label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {jobs.length} jobs
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">ID</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Video ID</th>
                <th className="text-left p-3 font-medium">Attempts</th>
                <th className="text-left p-3 font-medium">Duration</th>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-left p-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No jobs found
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/50">
                    <td className="p-3 font-mono text-xs">
                      {job.id.substring(0, 8)}...
                    </td>
                    <td className="p-3">{job.type}</td>
                    <td className="p-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${getStatusColor(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {job.videoId ? (
                        <a
                          href={`/admin/comparisons?video=${job.videoId}`}
                          className="text-blue-600 hover:underline font-mono text-xs"
                        >
                          {job.videoId.substring(0, 8)}...
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3">
                      {job.attempts}/{job.maxAttempts}
                    </td>
                    <td className="p-3 text-sm">{getDuration(job)}</td>
                    <td className="p-3 text-sm">{formatDate(job.createdAt)}</td>
                    <td className="p-3 text-sm max-w-xs truncate">
                      {job.error ? (
                        <span className="text-red-600" title={job.error}>
                          {job.error}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing most recent {jobs.length} jobs. Older jobs are automatically
          cleaned up.
        </div>
      )}
    </div>
  );
}
