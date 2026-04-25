/**
 * Deployment stage.
 *
 * Stages namespace resources (like S3 keys) so multiple environments
 * can share the same bucket without colliding. The current stage is
 * read from the `STAGE` environment variable.
 */

export enum Stage {
  Alpha = "alpha",
  Beta = "beta",
  Gamma = "gamma",
  Prod = "prod",
  Dev = "dev",
}

export const DEFAULT_STAGE: Stage = Stage.Dev;

export const STAGES: readonly Stage[] = Object.values(Stage);

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

/**
 * Read the current stage from `process.env.STAGE`.
 * Falls back to `DEFAULT_STAGE` if unset or invalid.
 */
export function getStage(): Stage {
  const raw = process.env.STAGE;
  if (raw && isStage(raw)) return raw;
  return DEFAULT_STAGE;
}
