import { describe, it, expect } from "vitest";
import globalReducer, {
  setIsSidebarCollapsed,
  setIsDarkMode,
  setImpersonatedUser,
  setActiveWorkspaceId,
  showNotification,
  dismissNotification,
} from "@/state/index";

const initialState = {
  isSidebarCollapsed: false,
  isDarkMode: false,
  impersonatedUser: null,
  notifications: [],
  activeWorkspaceId: null,
};

describe("globalSlice", () => {
  it("returns initial state", () => {
    const state = globalReducer(undefined, { type: "unknown" });
    expect(state.isSidebarCollapsed).toBe(false);
    expect(state.isDarkMode).toBe(false);
    expect(state.impersonatedUser).toBeNull();
    expect(state.notifications).toEqual([]);
    expect(state.activeWorkspaceId).toBeNull();
  });

  it("toggles sidebar collapsed", () => {
    const state = globalReducer(initialState, setIsSidebarCollapsed(true));
    expect(state.isSidebarCollapsed).toBe(true);

    const state2 = globalReducer(state, setIsSidebarCollapsed(false));
    expect(state2.isSidebarCollapsed).toBe(false);
  });

  it("toggles dark mode", () => {
    const state = globalReducer(initialState, setIsDarkMode(true));
    expect(state.isDarkMode).toBe(true);
  });

  it("sets impersonated user", () => {
    const user = {
      cognitoId: "abc-123",
      userId: 42,
      username: "testuser",
      email: "test@example.com",
    };
    const state = globalReducer(initialState, setImpersonatedUser(user));
    expect(state.impersonatedUser).toEqual(user);
  });

  it("clears impersonated user", () => {
    const withUser = {
      ...initialState,
      impersonatedUser: {
        cognitoId: "abc",
        userId: 1,
        username: "u",
      },
    };
    const state = globalReducer(withUser, setImpersonatedUser(null));
    expect(state.impersonatedUser).toBeNull();
  });

  it("sets active workspace ID", () => {
    const state = globalReducer(initialState, setActiveWorkspaceId(5));
    expect(state.activeWorkspaceId).toBe(5);
  });

  it("adds a notification", () => {
    const state = globalReducer(
      initialState,
      showNotification({ message: "Task created", type: "success" }),
    );
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].message).toBe("Task created");
    expect(state.notifications[0].type).toBe("success");
    expect(state.notifications[0].id).toBeDefined();
  });

  it("dismisses a notification by id", () => {
    const withNotif = {
      ...initialState,
      notifications: [{ id: "123", message: "Hello", type: "success" as const }],
    };
    const state = globalReducer(withNotif, dismissNotification("123"));
    expect(state.notifications).toHaveLength(0);
  });

  it("does not dismiss non-matching notification", () => {
    const withNotif = {
      ...initialState,
      notifications: [{ id: "123", message: "Hello", type: "success" as const }],
    };
    const state = globalReducer(withNotif, dismissNotification("999"));
    expect(state.notifications).toHaveLength(1);
  });
});
