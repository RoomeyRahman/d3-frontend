import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { uploadApi } from "./api/uploadApi";
import sessionReducer from "./features/sessionSlice";

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    [uploadApi.reducerPath]: uploadApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(uploadApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
