// Export types
export type {
  Logger,
  Storage,
  SamplingFn,
  ErrorDetails,
  WideEvent,
  WideLoggerContext,
  WideLoggerOptions,
} from "./types";

// Export main middleware
export { wideLogger } from "./middleware";

// Export utilities
export { defaultSampling } from "./sampling";
