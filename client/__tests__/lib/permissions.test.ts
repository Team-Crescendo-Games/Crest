import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  ALL_PERMISSIONS,
  ADMIN_PERMISSIONS,
  hasPermission,
} from "@/lib/permissions";

describe("permissions", () => {
  describe("PERMISSIONS constants", () => {
    it("has correct bitmask values", () => {
      expect(PERMISSIONS.DELETE).toBe(1);
      expect(PERMISSIONS.EDIT_INFO).toBe(2);
      expect(PERMISSIONS.INVITE).toBe(4);
      expect(PERMISSIONS.EDIT_MEMBER_ROLES).toBe(8);
      expect(PERMISSIONS.MANAGE_APPLICATIONS).toBe(16);
    });

    it("ALL_PERMISSIONS includes all flags", () => {
      expect(ALL_PERMISSIONS).toBe(31);
    });

    it("ADMIN_PERMISSIONS excludes DELETE", () => {
      expect(ADMIN_PERMISSIONS).toBe(30);
      expect(hasPermission(ADMIN_PERMISSIONS, PERMISSIONS.DELETE)).toBe(false);
      expect(hasPermission(ADMIN_PERMISSIONS, PERMISSIONS.EDIT_INFO)).toBe(
        true,
      );
    });
  });

  describe("hasPermission", () => {
    it("returns true when user has the required permission", () => {
      const userPerms = PERMISSIONS.EDIT_INFO | PERMISSIONS.INVITE; // 6
      expect(hasPermission(userPerms, PERMISSIONS.EDIT_INFO)).toBe(true);
      expect(hasPermission(userPerms, PERMISSIONS.INVITE)).toBe(true);
    });

    it("returns false when user lacks the required permission", () => {
      const userPerms = PERMISSIONS.EDIT_INFO; // 2
      expect(hasPermission(userPerms, PERMISSIONS.DELETE)).toBe(false);
      expect(hasPermission(userPerms, PERMISSIONS.INVITE)).toBe(false);
    });

    it("returns true for ALL_PERMISSIONS against any single permission", () => {
      expect(hasPermission(ALL_PERMISSIONS, PERMISSIONS.DELETE)).toBe(true);
      expect(hasPermission(ALL_PERMISSIONS, PERMISSIONS.MANAGE_APPLICATIONS)).toBe(true);
    });

    it("returns false for 0 permissions", () => {
      expect(hasPermission(0, PERMISSIONS.DELETE)).toBe(false);
    });
  });
});
