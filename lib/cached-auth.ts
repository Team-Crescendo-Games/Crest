import { cache } from "react";
import { auth } from "@/lib/auth";

/**
 * React.cache-wrapped auth() so that multiple calls within the same
 * server-render pass (layout + page) share a single resolution.
 */
export const getSession = cache(() => auth());
