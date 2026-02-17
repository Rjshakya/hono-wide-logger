/**
 * Logger interface - any object with standard logging methods
 */
export interface Logger {
  log(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * Storage interface - key-value store for persisting events
 */
export interface Storage {
  set(key: string, value: any): Promise<void> | void;
  get(key: string): Promise<any> | any;
  delete(key: string): Promise<void> | void;
}

/**
 * Sampling function - determines if an event should be logged
 */
export type SamplingFn = (event: WideEvent) => boolean;

/**
 * Error details within a wide event
 */
export interface ErrorDetails {
  type: string;
  code: string;
  message: string;
  retriable?: boolean;
  stack?: string;
}

/**
 * Wide Event structure - comprehensive log event with high cardinality and dimensionality
 */
export interface WideEvent {
  // HTTP Basics (auto-captured)
  request_id: string;
  timestamp: string;
  method: string;
  path: string;
  query_params?: Record<string, string>;
  status_code?: number;
  duration_ms?: number;
  client_ip?: string;
  user_agent?: string;
  content_type?: string;
  request_size_bytes?: number;
  response_size_bytes?: number;

  // Categorized Context (user-added)
  user?: Record<string, any>; // User context: id, tier, etc.
  business?: Record<string, any>; // Business logic: order, cart, etc.
  infra?: Record<string, any>; // Infrastructure: k8s, region, etc.
  service?: Record<string, any>; // Service metadata: version, git_sha

  // Error Details
  error?: ErrorDetails;
}

/**
 * Context API exposed to handlers via c.get('wide-logger')
 */
export interface WideLoggerContext {
  /**
   * Add categorized context to the event
   * @param category - 'user' | 'business' | 'infra' | 'service'
   * @param data - Key-value pairs to add
   */
  addContext(category: "user" | "business" | "infra" | "service", data: Record<string, any>): void;

  /**
   * Add error details to the event
   * @param error - Error object
   * @param metadata - Additional error metadata
   */
  addError(error: Error, metadata?: Record<string, any>): void;

  /**
   * Get current event state (for inspection)
   */
  getEvent(): Partial<WideEvent>;
}

/**
 * Configuration options for wideLogger middleware
 */
export interface WideLoggerOptions {
  /**
   * Logger instance for outputting events
   * @default console
   */
  logger?: Logger;

  /**
   * Storage instance for persisting events
   * @default undefined
   */
  storage?: Storage;

  /**
   * Custom sampling function
   * @default defaultSampling
   */
  sampling?: SamplingFn;

  /**
   * Threshold in ms for considering a request "slow"
   * @default 2000
   */
  slowThresholdMs?: number;

  /**
   * Sample rate for non-error, non-slow requests (0-1)
   * @default 0.05
   */
  sampleRate?: number;

  /**
   * Function to generate request IDs
   * @default crypto.randomUUID
   */
  generateRequestId?: () => string;

  /**
   * Header name for request ID propagation
   * @default 'x-request-id'
   */
  requestIdHeader?: string;

  /**
   * Error code to for sampling error logs
   * @default 400
   */
  errorCode?:400|500
}

/**
 * Internal options with defaults applied
 */
export interface InternalOptions extends Required<WideLoggerOptions> {
  logger: Logger;
  slowThresholdMs: number;
  sampleRate: number;
  generateRequestId: () => string;
  requestIdHeader: string;
}
