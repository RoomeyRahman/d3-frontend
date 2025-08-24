"use client";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  SessionData,
  Recommendation,
  DataProfile,
} from "../api/uploadApi";

interface SessionState {
  currentSessionId: string | null;
  sessions: Record<string, SessionData>;
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
      }>
    ) => {
      const { sessionId, data_profile, recommendations, sample_data } =
        action.payload;
      state.sessions[sessionId] = {
        session_id: sessionId,
        data_profile,
        recommendations,
        sample_data,
        rag_enhanced: true,
        conversation_history: [],
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
  },
});

export const {
  setCurrentSession,
  addSessionData,
  addUploadRecord,
  clearSession,
  clearAllSessions,
} = sessionSlice.actions;
export default sessionSlice.reducer;
