import type { WideEvent } from "./types";

/**
 * Default sampling strategy for wide events
 * - Always keep errors (status >= 500 or has error field)
 * - Always keep slow requests (> threshold)
 * - Always keep VIP users (enterprise/premium tier)
 * - Random sample the rest
 */
export function defaultSampling(
  event: WideEvent,
  options: { slowThresholdMs: number; sampleRate: number },
): boolean {
  // Always keep errors
  if (event.status_code && event.status_code >= 500) return true;
  if (event.error) return true;

  // Always keep slow requests
  if (event.duration_ms && event.duration_ms > options.slowThresholdMs) {
    return true;
  }

  // Always keep VIP users (enterprise/premium tier)
  if (event.user?.tier === "enterprise" || event.user?.tier === "premium") {
    return true;
  }

  // Random sample the rest
  return Math.random() < options.sampleRate;
}
