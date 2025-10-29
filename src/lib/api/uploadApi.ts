"use client";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface UploadRequest {
  file: File;
  description?: string;
  session_id?: string;
}

export interface UploadResponse {
  session_id: string;
  message?: string;
  status?: string;
  data_profile?: DataProfile;
  recommendations?: Recommendation[];
  sample_data?: any[];
}

export interface ChartRecommendationResponse {
  recommendations: Recommendation[];
  data: Array<{
    name: string;
    role: string;
    df: any[];
  }>;
  patterns_detected: Array<{
    pattern: string;
    confidence: number;
    description: string;
  }>;
  chart_configuration: {
    chartType: string;
    dataMapping: any;
    dimensions: any;
    scales: any;
    axes: any;
    legend: any;
    tooltip: any;
    interactions: any;
    styling: any;
    chartSpecific: any;
    metadata: any;
    accessibility: any;
    performance: any;
  };
  original_payload: {
    type: string;
    nodes: { id: string; group: number }[];
    links: { source: string; target: string; value: number }[];
  };
}

export interface GenerateChartRequest {
  dataset_id: string;
  target_chart: string;
}

export interface GenerateChartResponse {
  chart_type: string;
  html_code: string;
  javascript_code: string;
  data_sample: string;
  instructions: string[];
  dependencies: string[];
}

export interface Recommendation {
  chart_type: string;
  d3_template: string;
  confidence: number;
  reasoning: string;
  data_requirements: any;
  complexity: string;
}

export interface DataProfile {
  num_rows: number;
  num_columns: number;
  column_types: Record<string, string>;
  numerical_columns: string[];
  categorical_columns: string[];
  temporal_columns: string[];
  geographic_columns: string[];
  statistical_summary: any;
  correlation_matrix: any;
  has_time_series: boolean;
  has_hierarchical: boolean;
  has_network_structure: boolean;
  has_geographic_data: boolean;
  null_percentages: Record<string, number>;
  unique_ratios: Record<string, number>;
  suggested_patterns: string[];
}

export interface SessionData {
  session_id: string;
  data_profile: DataProfile;
  recommendations: Recommendation[];
  sample_data: any[];
  rag_enhanced: boolean;
  conversation_history: any[];
}

export const uploadApi = createApi({
  reducerPath: "uploadApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
  }),
  tagTypes: ["Upload", "Chart", "Session"],
  endpoints: (builder) => ({
    uploadFile: builder.mutation<UploadResponse, UploadRequest>({
      query: ({ file, description, session_id }) => {
        const formData = new FormData();
        formData.append("file", file, file.name);

        if (description?.trim()) {
          formData.append("description", description.trim());
        }

        if (session_id?.trim()) {
          formData.append("session_id", session_id.trim());
        }

        return {
          url: "/api/data/upload",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Upload"],
    }),

    getChartRecommendations: builder.mutation<
      ChartRecommendationResponse,
      UploadRequest
    >({
      query: ({ file, description }) => {
        const formData = new FormData();
        formData.append("file", file, file.name);

        if (description?.trim()) {
          formData.append("description", description.trim());
        }

        return {
          url: "/api/v1/charts/recommend",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Chart"],
    }),

    generateChart: builder.mutation<
      GenerateChartResponse,
      GenerateChartRequest
    >({
      query: ({ dataset_id, target_chart }) => ({
        url: `/api/v1/charts/configure`,
        method: "GET",
        params: {
          dataset_id,
          target_chart,
        },
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      }),
      transformResponse: (response: any) => {
        // If we get HTML instead of JSON, throw an error
        if (
          typeof response === "string" &&
          response.includes("<!DOCTYPE html>")
        ) {
          throw new Error(
            "Received HTML instead of JSON - API endpoint may be misconfigured"
          );
        }
        return response;
      },
      invalidatesTags: ["Chart"],
    }),

    getSessionById: builder.query<SessionData, string>({
      query: (sessionId) => ({
        url: `/api/data/session/${sessionId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "Session", id }],
    }),
  }),
});

export const {
  useUploadFileMutation,
  useGetChartRecommendationsMutation,
  useGetSessionByIdQuery,
  useGenerateChartMutation,
} = uploadApi;
