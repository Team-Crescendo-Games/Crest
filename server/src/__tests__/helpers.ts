import type { Request, Response } from "express";
import { vi } from "vitest";

/** Build a mock Prisma client where every model is a nested object of vi.fn() */
export function createMockPrisma() {
    const handler: ProxyHandler<any> = {
        get(_target, prop) {
            // $transaction is special — it executes the callback or array
            if (prop === "$transaction") {
                return vi.fn(async (arg: any) => {
                    if (typeof arg === "function") return arg(mockPrisma);
                    return Promise.all(arg);
                });
            }
            // Return a proxy for each model so any method call returns a vi.fn()
            if (typeof prop === "string" && !prop.startsWith("_")) {
                if (!modelCache[prop]) {
                    modelCache[prop] = new Proxy(
                        {},
                        {
                            get(t: any, method: string) {
                                if (!t[method]) t[method] = vi.fn();
                                return t[method];
                            },
                        }
                    );
                }
                return modelCache[prop];
            }
            return undefined;
        },
    };

    const modelCache: Record<string, any> = {};
    const mockPrisma = new Proxy({}, handler);
    return mockPrisma as any;
}

/** Create a minimal mock Express Request */
export function mockReq(
    overrides: {
        params?: Record<string, string>;
        query?: Record<string, string>;
        body?: any;
        headers?: Record<string, string>;
    } = {}
): Request {
    return {
        params: overrides.params ?? {},
        query: overrides.query ?? {},
        body: overrides.body ?? {},
        headers: overrides.headers ?? {},
    } as unknown as Request;
}

/** Create a mock Express Response that captures status, json, send, etc. */
export function mockRes() {
    const res: any = {
        statusCode: 200,
        body: undefined,
        _sent: false,
    };
    res.status = vi.fn((code: number) => {
        res.statusCode = code;
        return res;
    });
    res.json = vi.fn((data: any) => {
        res.body = data;
        res._sent = true;
        return res;
    });
    res.send = vi.fn((data?: any) => {
        res.body = data;
        res._sent = true;
        return res;
    });
    return res as Response & { statusCode: number; body: any };
}
