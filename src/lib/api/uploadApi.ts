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

export interface ChartRequest {
  session_id: string;
  chart_type: string;
}

export interface ChartResponse {
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

    generateChart: builder.mutation<ChartResponse, ChartRequest>({
      query: ({ session_id, chart_type }) => ({
        url: "/api/data/prepared-data",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: { session_id, chart_type },
      }),
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
  useGenerateChartMutation,
  useGetSessionByIdQuery,
} = uploadApi;
