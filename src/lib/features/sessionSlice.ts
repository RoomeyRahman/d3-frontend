"use client";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  SessionData,
  Recommendation,
  DataProfile,
} from "../api/uploadApi";

export interface ExtendedSessionData extends SessionData {
  chartData?: any[];
  chartConfig?: any;
  patternsDetected?: any[];
  original_payload?: {
    links: { source: string; target: string; value: number }[];
    nodes: { id: string; group: number }[];
  };
}

interface SessionState {
  currentSessionId: string | null;
  sessions: Record<string, ExtendedSessionData>;
  uploadHistory: Array<{
    sessionId: string;
    fileName: string;
    description: string;
    timestamp: string;
  }>;
}

const initialState: SessionState = {
  currentSessionId: null,
  sessions: {},
  uploadHistory: [],
};

// Load from localStorage
const loadFromLocalStorage = (): SessionState => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("sessionData");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
  }
  return initialState;
};

// Save to localStorage
const saveToLocalStorage = (state: SessionState) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("sessionData", JSON.stringify(state));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }
};

const sessionSlice = createSlice({
  name: "session",
  initialState: loadFromLocalStorage(),
  reducers: {
    setCurrentSession: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
      saveToLocalStorage(state);
    },

    addSessionData: (
      state,
      action: PayloadAction<{
        sessionId: string;
        data_profile: DataProfile;
        recommendations: Recommendation[];
        sample_data: any[];
        chartData?: any[];
        chartConfig?: any;
        patternsDetected?: any[];
        original_payload?: {
          type: string;
          nodes: { id: string; group: number }[];
          links: { source: string; target: string; value: number }[];
        };
      }>
    ) => {
      const { sessionId, data_profile, recommendations, sample_data, chartData, chartConfig, patternsDetected, original_payload } =
        action.payload;
      state.sessions[sessionId] = {
        session_id: sessionId,
        data_profile,
        recommendations,
        sample_data,
        rag_enhanced: true,
        conversation_history: [],
        chartData,
        chartConfig,
        patternsDetected,
        original_payload,
      };
      saveToLocalStorage(state);
    },

    addUploadRecord: (
      state,
      action: PayloadAction<{
        sessionId: string;
        fileName: string;
        description: string;
      }>
    ) => {
      state.uploadHistory.push({
        ...action.payload,
        timestamp: new Date().toISOString(),
      });
      saveToLocalStorage(state);
    },

    clearSession: (state) => {
      state.currentSessionId = null;
      saveToLocalStorage(state);
    },

    clearAllSessions: (state) => {
      state.sessions = {};
      state.uploadHistory = [];
      state.currentSessionId = null;
      saveToLocalStorage(state);
    },

    updateChartData: (
      state,
      action: PayloadAction<{
        sessionId: string;
        chartData: any[];
        chartConfig?: any;
        patternsDetected?: any[];
      }>
    ) => {
      const { sessionId, chartData, chartConfig, patternsDetected } = action.payload;
      if (state.sessions[sessionId]) {
        state.sessions[sessionId].chartData = chartData;
        if (chartConfig !== undefined) {
          state.sessions[sessionId].chartConfig = chartConfig;
        }
        if (patternsDetected !== undefined) {
          state.sessions[sessionId].patternsDetected = patternsDetected;
        }
        saveToLocalStorage(state);
      }
    },
  },
});

export const {
  setCurrentSession,
  addSessionData,
  addUploadRecord,
  clearSession,
  clearAllSessions,
  updateChartData,
} = sessionSlice.actions;
export default sessionSlice.reducer;
