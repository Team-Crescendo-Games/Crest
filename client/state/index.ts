import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { REHYDRATE } from "redux-persist";

export interface ImpersonatedUser {
  cognitoId: string;
  userId: number;
  username: string;
  email?: string;
}

export interface AppNotification {
  id: string;
  message: string;
  type: "success" | "error";
}

export interface initialStateTypes {
  isSidebarCollapsed: boolean;
  isDarkMode: boolean;
  impersonatedUser: ImpersonatedUser | null;
  notifications: AppNotification[];
  activeWorkspaceId: number | null; 
}

const initialState: initialStateTypes = {
  isSidebarCollapsed: false,
  isDarkMode: false,
  impersonatedUser: null,
  notifications: [],
  activeWorkspaceId: null, 
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setIsSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    setIsDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
    },
    setImpersonatedUser: (
      state,
      action: PayloadAction<ImpersonatedUser | null>,
    ) => {
      state.impersonatedUser = action.payload;
    },
    setActiveWorkspaceId: (state, action: PayloadAction<number | null>) => {
      state.activeWorkspaceId = action.payload; 
    },
    showNotification: (
      state,
      action: PayloadAction<Omit<AppNotification, "id">>,
    ) => {
      if (!state || !state.notifications) {
        return {
          ...initialState,
          ...state,
          notifications: [
            {
              ...action.payload,
              id: Date.now().toString(),
            },
          ],
        };
      }
      state.notifications.push({
        ...action.payload,
        id: Date.now().toString(),
      });
    },
    dismissNotification: (state, action: PayloadAction<string>) => {
      if (!state || !state.notifications) {
        return { ...initialState, ...state };
      }
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload,
      );
    },
  },
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE, (state, action: any) => {
      if (action.payload?.global) {
        return {
          ...action.payload.global,
          notifications: action.payload.global.notifications ?? [],
          activeWorkspaceId: action.payload.global.activeWorkspaceId ?? null,
        };
      }
      return state;
    });
  },
});

export const {
  setIsSidebarCollapsed,
  setIsDarkMode,
  setImpersonatedUser,
  setActiveWorkspaceId, 
  showNotification,
  dismissNotification,
} = globalSlice.actions;
export default globalSlice.reducer;
