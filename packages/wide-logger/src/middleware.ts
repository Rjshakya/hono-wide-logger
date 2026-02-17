import type { MiddlewareHandler } from "hono";
import type { WideEvent, WideLoggerContext, WideLoggerOptions } from "./types";
import { defaultSampling } from "./sampling";

declare module "hono" {
  interface ContextVariableMap {
    "wide-logger": WideLoggerContext;
  }
}

/**
 * Default options
 */
const defaultOptions: WideLoggerOptions = {
  slowThresholdMs: 2000,
  sampleRate: 0.05,
  generateRequestId: () => crypto.randomUUID(),
  requestIdHeader: "x-request-id",
};

/**
 * Wide Logger middleware factory
 * Returns a Hono middleware that captures comprehensive request context
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { wideLogger } from '@hono/wide-logger';
 *
 * const app = new Hono();
 * app.use('*', wideLogger());
 *
 * app.get('/users/:id', async (c) => {
 *   const logger = c.get('wide-logger');
 *   logger.addContext('user', { id: '123', tier: 'premium' });
 *   return c.json({ id: '123' });
 * });
 * ```
 */

export function wideLogger(options?: WideLoggerOptions): MiddlewareHandler {
  const opts = {
    ...defaultOptions,
    logger: options?.logger ?? console,
    ...options,
  };

  return async (c, next) => {
    const startTime = Date.now();

    // Generate request ID once and ensure it's always defined
    const requestId =
      c.req.header(opts.requestIdHeader || "x-request-id") ||
      opts.generateRequestId?.() ||
      crypto.randomUUID();

    // Initialize event with request basics
    const event: Partial<WideEvent> = {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      method: c.req.method,
      path: c.req.path,
      client_ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
      user_agent: c.req.header("user-agent"),
      content_type: c.req.header("Content-type"),
    };

    // Create context API for handlers
    const wideLoggerContext: WideLoggerContext = {
      addContext: (category, data) => {
        event[category] = { ...event[category], ...data };
      },
      addError: (error, metadata) => {
        event.error = {
          type: error.name,
          code: (error as any).code || "UNKNOWN",
          message: error.message,
          retriable: (error as any).retriable ?? false,
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
          ...metadata,
        };
      },
      getEvent: () => ({ ...event }),
    };

    // Set context for downstream handlers
    c.set("wide-logger", wideLoggerContext);

    // Set response header with request ID for distributed tracing
    c.header("x-request-id", requestId);

    try {
      await next();

      // Post-request: finalize event
      event.status_code = c.res.status;
      event.duration_ms = Date.now() - startTime;
    } catch (error) {
      // Handle errors
      event.status_code = 500;
      event.duration_ms = Date.now() - startTime;
      wideLoggerContext.addError(error as Error);
      throw error;
    } finally {
      // Sampling decision
      const shouldLog = opts.sampling
        ? opts.sampling(event as WideEvent)
        : defaultSampling(event as WideEvent, {
            slowThresholdMs: opts.slowThresholdMs || 2000,
            sampleRate: opts.sampleRate || 0.05,
            errorCode:opts.errorCode
          });

      if (shouldLog) {
        // Log to configured logger
        opts.logger.info(JSON.stringify(event));

        // Store if storage is configured
        if (opts.storage) {
          await opts.storage.set(requestId as string, event);
        }
      }
    }
  };
}
