"use client";
import { useAppSelector } from "@/lib/hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  PieChart,
  LineChart,
  TrendingUp,
  MapPin,
  Activity,
  Database,
  Calendar,
  ChartScatter,
} from "lucide-react";

interface RecommendationComponentProps {
  sessionId: string;
}

const RecommendationComponent = ({
  sessionId,
}: RecommendationComponentProps) => {
  const sessionData = useAppSelector(
    (state) => state.session.sessions[sessionId]
  );

  const getChartIcon = (chartType: string) => {
    switch (chartType.toLowerCase()) {
      case "bar_chart":
        return <BarChart3 className="h-5 w-5" />;
      case "line_chart":
        return <LineChart className="h-5 w-5" />;
      case "scatter_plot":
        return <ChartScatter className="h-5 w-5" />;
      case "pie_chart":
        return <PieChart className="h-5 w-5" />;
      case "force_directed_graph":
      case "forcedirectedgraph":
        return <Activity className="h-5 w-5" />;
      default:
        return <TrendingUp className="h-5 w-5" />;
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity?.toLowerCase()) {
      case "low":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
      case "high":
        return "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
    }
  };

  const formatChartType = (chartType: string) => {
    return chartType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (!sessionData?.recommendations) {
    return (
      <div className="px-6 py-8 space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-slate-600" />
            Chart Recommendations
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            AI-powered visualization suggestions for your data
          </p>
        </div>

        <Card className="p-8 border-dashed border-2 border-slate-300">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-slate-100 rounded-full">
              <BarChart3 className="h-8 w-8 text-slate-400" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 mb-2">
                No Recommendations Available
              </h3>
              <p className="text-sm text-slate-600 max-w-md">
                {` Upload and analyze your data to receive personalized chart recommendations
                based on your dataset's characteristics.`}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-slate-600" />
          Chart Recommendations
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          AI-powered visualization suggestions based on your data analysis
        </p>
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {sessionData.recommendations.map((rec, index) => (
          <Card
            key={index}
            className="p-5 border border-slate-200 hover:border-slate-300 transition-all duration-300 hover:shadow-lg group"
          >
            <div className="flex items-start gap-4">
              {/* Chart Icon */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 group-hover:bg-blue-100 transition-colors">
                <div className="text-blue-600">
                  {getChartIcon(rec.chart_type)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 space-y-3">
                {/* Title and Complexity */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 text-base">
                    {formatChartType(rec.chart_type)}
                  </h3>
                  <Badge
                    className={`${getComplexityColor(
                      rec.complexity
                    )} text-xs font-medium px-2 py-1`}
                  >
                    {rec.complexity} Complexity
                  </Badge>
                </div>

                {/* Confidence Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium">
                      Confidence Score
                    </span>
                    <span className="font-semibold text-slate-900">
                      {Math.round(rec.confidence * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={rec.confidence * 100}
                    className="h-2.5 bg-slate-100"
                  />
                </div>

                {/* Reasoning */}
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border">
                  {rec.reasoning}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Dataset Profile */}
      {sessionData.data_profile && (
        <Card className="p-6 bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200">
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-slate-600" />
              Dataset Profile
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Stats */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-sm text-slate-600 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Total Records
                  </span>
                  <span className="font-semibold text-slate-900">
                    {sessionData.data_profile.num_rows?.toLocaleString() ||
                      "N/A"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-sm text-slate-600 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Data Fields
                  </span>
                  <span className="font-semibold text-slate-900">
                    {sessionData.data_profile.num_columns || "N/A"}
                  </span>
                </div>
              </div>

              {/* Data Types */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-sm text-slate-600 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Geographic Data
                  </span>
                  <Badge
                    variant={
                      sessionData.data_profile.has_geographic_data
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {sessionData.data_profile.has_geographic_data
                      ? "Available"
                      : "Not Available"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                  <span className="text-sm text-slate-600 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Time Series Data
                  </span>
                  <Badge
                    variant={
                      sessionData.data_profile.has_time_series
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {sessionData.data_profile.has_time_series
                      ? "Available"
                      : "Not Available"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default RecommendationComponent;
