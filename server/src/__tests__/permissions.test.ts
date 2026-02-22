import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  PERMISSIONS,
  ALL_PERMISSIONS,
  hasPermission,
} from "../lib/permissions.ts";

// ─── Unit Tests ───

describe("PERMISSIONS constants", () => {
  it("defines DELETE as 1", () => {
    expect(PERMISSIONS.DELETE).toBe(1);
  });

  it("defines EDIT_INFO as 2", () => {
    expect(PERMISSIONS.EDIT_INFO).toBe(2);
  });

  it("defines INVITE as 4", () => {
    expect(PERMISSIONS.INVITE).toBe(4);
  });

  it("defines EDIT_MEMBER_ROLES as 8", () => {
    expect(PERMISSIONS.EDIT_MEMBER_ROLES).toBe(8);
  });
});

describe("ALL_PERMISSIONS", () => {
  it("equals 15 (all bits set)", () => {
    expect(ALL_PERMISSIONS).toBe(15);
  });

  it("includes every individual permission", () => {
    for (const bit of Object.values(PERMISSIONS)) {
      expect(ALL_PERMISSIONS & bit).toBe(bit);
    }
  });
});

describe("hasPermission", () => {
  it("returns true when user has the exact permission", () => {
    expect(hasPermission(PERMISSIONS.DELETE, PERMISSIONS.DELETE)).toBe(true);
  });

  it("returns true when user has all permissions and any single is checked", () => {
    expect(hasPermission(ALL_PERMISSIONS, PERMISSIONS.DELETE)).toBe(true);
  });

  it("returns false when user has no permissions", () => {
    expect(hasPermission(0, PERMISSIONS.DELETE)).toBe(false);
  });

  it("returns false when user has a different permission", () => {
    expect(hasPermission(PERMISSIONS.EDIT_INFO, PERMISSIONS.DELETE)).toBe(false);
  });

  it("handles combined permissions correctly", () => {
    const combined = PERMISSIONS.DELETE | PERMISSIONS.EDIT_INFO; // 6
    expect(hasPermission(combined, PERMISSIONS.DELETE)).toBe(true);
    expect(hasPermission(combined, PERMISSIONS.EDIT_INFO)).toBe(true);
    expect(hasPermission(combined, PERMISSIONS.INVITE)).toBe(false);
  });
});

// ─── Property-Based Tests ───

const permissionBits = [
  PERMISSIONS.DELETE,
  PERMISSIONS.EDIT_INFO,
  PERMISSIONS.INVITE,
  PERMISSIONS.EDIT_MEMBER_ROLES,
];

const permissionBitArb = fc.constantFrom(...permissionBits);
const permissionsIntArb = fc.integer({ min: 0, max: 15 });

describe("Property 1: Bitwise permission check correctness", () => {
  /**
   * **Validates: Requirements 2.1**
   *
   * For any permissions integer p (0 ≤ p ≤ 15) and for any permission bit b
   * in {1, 2, 4, 8}, hasPermission(p, b) returns true if and only if
   * (p & b) === b.
   */
  it("hasPermission(p, b) ↔ (p & b) === b for all valid p and b", () => {
    fc.assert(
      fc.property(permissionsIntArb, permissionBitArb, (p, b) => {
        expect(hasPermission(p, b)).toBe((p & b) === b);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 2.3**
   *
   * A permissions value of 15 grants access for all defined permissions.
   */
  it("permissions=15 grants all permissions", () => {
    fc.assert(
      fc.property(permissionBitArb, (b) => {
        expect(hasPermission(15, b)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.4**
   *
   * A permissions value of 0 denies access for all defined permissions.
   */
  it("permissions=0 denies all permissions", () => {
    fc.assert(
      fc.property(permissionBitArb, (b) => {
        expect(hasPermission(0, b)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
