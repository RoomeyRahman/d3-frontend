"use client";
import { useAppSelector } from "@/lib/hooks";

interface RecommendationComponentProps {
  sessionId: string;
}

const RecommendationComponent = ({
  sessionId,
}: RecommendationComponentProps) => {
  const sessionData = useAppSelector(
    (state) => state.session.sessions[sessionId]
  );

  if (!sessionData?.recommendations) {
    return (
      <div className="px-5 mt-5 text-gray-900">
        <div>
          <p className="text-lg font-semibold">Recommendations</p>
        </div>
        <div className="mt-5">
          <p className="text-sm font-thin leading-7">
            No recommendations available for this session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 mt-5 text-gray-900">
      <div>
        <p className="text-lg font-semibold">Chart Recommendations</p>
      </div>
      <div className="mt-5 space-y-4">
        {sessionData.recommendations.map((rec, index) => (
          <div key={index} className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-medium text-sm">
              {rec.chart_type.replace("_", " ").toUpperCase()}
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Confidence: {Math.round(rec.confidence * 100)}%
            </p>
            <p className="text-xs text-gray-700 mt-2">{rec.reasoning}</p>
            <p className="text-xs text-gray-500 mt-1">
              Complexity: {rec.complexity}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <h4 className="font-medium text-sm">Data Profile</h4>
        <div className="text-xs text-gray-600 mt-2 space-y-1">
          <p>Rows: {sessionData.data_profile.num_rows}</p>
          <p>Columns: {sessionData.data_profile.num_columns}</p>
          <p>
            Geographic Data:{" "}
            {sessionData.data_profile.has_geographic_data ? "Yes" : "No"}
          </p>
          <p>
            Time Series:{" "}
            {sessionData.data_profile.has_time_series ? "Yes" : "No"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecommendationComponent;
