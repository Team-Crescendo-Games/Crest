import { describe, it, expect } from "vitest";
import {
    PERMISSIONS,
    ALL_PERMISSIONS,
    ADMIN_PERMISSIONS,
    hasPermission,
} from "../lib/permissions.ts";

describe("permissions", () => {
    it("ALL_PERMISSIONS includes all flags", () => {
        expect(hasPermission(ALL_PERMISSIONS, PERMISSIONS.DELETE)).toBe(true);
        expect(hasPermission(ALL_PERMISSIONS, PERMISSIONS.EDIT_INFO)).toBe(true);
        expect(hasPermission(ALL_PERMISSIONS, PERMISSIONS.INVITE)).toBe(true);
        expect(hasPermission(ALL_PERMISSIONS, PERMISSIONS.EDIT_MEMBER_ROLES)).toBe(true);
        expect(hasPermission(ALL_PERMISSIONS, PERMISSIONS.MANAGE_APPLICATIONS)).toBe(true);
    });

    it("ADMIN_PERMISSIONS excludes DELETE", () => {
        expect(hasPermission(ADMIN_PERMISSIONS, PERMISSIONS.DELETE)).toBe(false);
        expect(hasPermission(ADMIN_PERMISSIONS, PERMISSIONS.EDIT_INFO)).toBe(true);
        expect(hasPermission(ADMIN_PERMISSIONS, PERMISSIONS.INVITE)).toBe(true);
    });

    it("hasPermission returns false for 0 permissions", () => {
        expect(hasPermission(0, PERMISSIONS.INVITE)).toBe(false);
    });

    it("single permission check works", () => {
        expect(hasPermission(PERMISSIONS.INVITE, PERMISSIONS.INVITE)).toBe(true);
        expect(hasPermission(PERMISSIONS.INVITE, PERMISSIONS.DELETE)).toBe(false);
    });
});
