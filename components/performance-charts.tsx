"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ModelPerformance {
  modelName: string;
  avgGenerationTime: number;
  avgDuration: number;
  avgCost: number;
  totalVideos: number;
  completedVideos: number;
  failedVideos: number;
  totalVotes: number;
}

interface PerformanceChartsProps {
  data: ModelPerformance[];
}

export function PerformanceCharts({ data }: PerformanceChartsProps) {
  // Sort by generation time (fastest first)
  const genTimeFastestData = [...data]
    .filter((d) => d.avgGenerationTime > 0)
    .sort((a, b) => a.avgGenerationTime - b.avgGenerationTime)
    .slice(0, 10);

  // Sort by generation time (slowest first)
  const genTimeSlowestData = [...data]
    .filter((d) => d.avgGenerationTime > 0)
    .sort((a, b) => b.avgGenerationTime - a.avgGenerationTime)
    .slice(0, 10);

  // Sort by votes for leaderboard
  const voteLeaderboard = [...data]
    .filter((d) => d.totalVotes > 0)
    .sort((a, b) => b.totalVotes - a.totalVotes)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Average Generation Time - Fastest */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          Average Generation Time (Top 10 Fastest)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={genTimeFastestData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="modelName"
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
            />
            <YAxis label={{ value: "Seconds", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgGenerationTime" fill="#8884d8" name="Avg Gen Time (s)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Average Generation Time - Slowest */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          Average Generation Time (Top 10 Slowest)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={genTimeSlowestData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="modelName"
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
            />
            <YAxis label={{ value: "Seconds", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgGenerationTime" fill="#ff8042" name="Avg Gen Time (s)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Vote Leaderboard */}
      {voteLeaderboard.length > 0 && (
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Most Voted Models (Top 10)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={voteLeaderboard}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="modelName"
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis label={{ value: "Total Votes", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalVotes" fill="#ffc658" name="Total Votes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Average Cost - Cheapest */}
      {data.some((d) => d.avgCost > 0) && (
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Average Cost per Model (Top 10 Cheapest)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[...data]
                .filter((d) => d.avgCost > 0)
                .sort((a, b) => a.avgCost - b.avgCost)
                .slice(0, 10)}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="modelName"
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis
                label={{ value: "Cost ($)", angle: -90, position: "insideLeft" }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip formatter={(value: number) => `$${value.toFixed(3)}`} />
              <Legend />
              <Bar dataKey="avgCost" fill="#00C49F" name="Avg Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Average Cost - Most Expensive */}
      {data.some((d) => d.avgCost > 0) && (
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            Average Cost per Model (Top 10 Most Expensive)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[...data]
                .filter((d) => d.avgCost > 0)
                .sort((a, b) => b.avgCost - a.avgCost)
                .slice(0, 10)}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="modelName"
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis
                label={{ value: "Cost ($)", angle: -90, position: "insideLeft" }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              <Tooltip formatter={(value: number) => `$${value.toFixed(3)}`} />
              <Legend />
              <Bar dataKey="avgCost" fill="#ff6b6b" name="Avg Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
}
