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
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface ModelPerformance {
  modelName: string;
  avgGenerationTime: number;
  avgDuration: number;
  totalVideos: number;
  completedVideos: number;
  failedVideos: number;
  totalVotes: number;
}

interface PerformanceChartsProps {
  data: ModelPerformance[];
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF6B9D",
];

export function PerformanceCharts({ data }: PerformanceChartsProps) {
  // Sort by generation time for the first chart
  const genTimeData = [...data]
    .filter((d) => d.avgGenerationTime > 0)
    .sort((a, b) => a.avgGenerationTime - b.avgGenerationTime)
    .slice(0, 10);

  // Calculate success rate
  const successRateData = data
    .filter((d) => d.totalVideos > 0)
    .map((d) => ({
      name: d.modelName,
      successRate: (d.completedVideos / d.totalVideos) * 100,
      total: d.totalVideos,
    }))
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 10);

  // Sort by votes for leaderboard
  const voteLeaderboard = [...data]
    .filter((d) => d.totalVotes > 0)
    .sort((a, b) => b.totalVotes - a.totalVotes)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Average Generation Time */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          Average Generation Time (Top 10 Fastest)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={genTimeData}>
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

      {/* Success Rate */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          Success Rate by Model (Top 10)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={successRateData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              fontSize={12}
            />
            <YAxis
              label={{ value: "Success Rate (%)", angle: -90, position: "insideLeft" }}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(1)}%`}
              labelFormatter={(label) => `Model: ${label}`}
            />
            <Legend />
            <Bar dataKey="successRate" fill="#82ca9d" name="Success Rate (%)" />
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

      {/* Video Duration */}
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          Average Video Duration by Model
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={[...data]
              .filter((d) => d.avgDuration > 0)
              .sort((a, b) => b.avgDuration - a.avgDuration)
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
            <YAxis label={{ value: "Seconds", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgDuration" fill="#ff8042" name="Avg Duration (s)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
