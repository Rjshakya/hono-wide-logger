# hono-wide-logger

Wide-event logging middleware for Hono - structured, high-cardinality, queryable logs inspired by [loggingsucks.com](https://loggingsucks.com).

## Features

- **One event per request** - Comprehensive context instead of scattered logs
- **High cardinality** - Track user IDs, request IDs, session IDs
- **High dimensionality** - 50+ fields with rich context
- **Pluggable architecture** - Use your own logger, storage, and sampling
- **Type-safe** - Full TypeScript support with Hono's `createMiddleware`

## Installation

```bash
npm install hono-wide-logger
# or
pnpm add hono-wide-logger
# or
yarn add hono-wide-logger
```

## Quick Start

```typescript
import { Hono } from "hono";
import { wideLogger } from "hono-wide-logger";

const app = new Hono();

// Add middleware
app.use("*", wideLogger());

app.get("/users/:id", async (c) => {
  const logger = c.get("wide-logger");

  // Add user context
  logger.addContext("user", {
    id: c.req.param("id"),
    tier: "premium",
  });

  // Add business context
  logger.addContext("business", {
    endpoint: "get_user",
    cache_hit: true,
  });

  return c.json({ id: c.req.param("id") });
});
```

## Configuration

```typescript
const logger = wideLogger({
  // Use custom logger (default: console)
  logger: pino(),

  // Persist events to storage (optional)
  storage: redisClient,

  // Custom sampling function (default: tail sampling)
  sampling: (event) => event.status_code >= 500 || Math.random() < 0.1,

  // Sampling options
  slowThresholdMs: 1000, // Log slow requests
  sampleRate: 0.05, // 5% of normal traffic
});

app.use("*", logger);
```

## API

### `wideLogger(options?)`

Creates a Hono middleware with wide-event logging.

**Options:**

| Option              | Type           | Default             | Description                                      |
| ------------------- | -------------- | ------------------- | ------------------------------------------------ |
| `logger`            | `Logger`       | `console`           | Logger instance with `.info()`, `.error()`, etc. |
| `storage`           | `Storage`      | `undefined`         | Key-value store for persisting events            |
| `sampling`          | `SamplingFn`   | `defaultSampling`   | Function to decide if event should be logged     |
| `slowThresholdMs`   | `number`       | `2000`              | Threshold for "slow" requests                    |
| `sampleRate`        | `number`       | `0.05`              | Sample rate for normal requests (0-1)            |
| `generateRequestId` | `() => string` | `crypto.randomUUID` | Request ID generator                             |
| `requestIdHeader`   | `string`       | `'x-request-id'`    | Header for request ID propagation                |

### Context API

Access via `c.get('wide-logger')`:

```typescript
const logger = c.get("wide-logger");

// Add categorized context
logger.addContext("user", { id: "123", tier: "premium" });
logger.addContext("business", { order_id: "ord_456" });
logger.addContext("infra", { region: "us-east-1" });
logger.addContext("service", { version: "1.2.3" });

// Add error details
logger.addError(error, { code: "PAYMENT_FAILED" });

// Inspect current event
const event = logger.getEvent();
```

## Default Sampling Strategy

The default sampling keeps:

- **All errors** (status >= 500)
- **All slow requests** (> slowThresholdMs)
- **All VIP users** (user.tier === 'enterprise' or 'premium')
- **5%** of remaining traffic

## Event Structure

```typescript
{
  // Auto-captured
  request_id: "req_...",
  timestamp: "2024-01-15T10:23:45.612Z",
  method: "GET",
  path: "/api/users/123",
  status_code: 200,
  duration_ms: 124,
  client_ip: "192.168.1.42",
  user_agent: "Mozilla/5.0...",

  // User-added
  user: { id: "123", tier: "premium" },
  business: { endpoint: "get_user" },

  // Error (if any)
  error: {
    type: "PaymentError",
    code: "card_declined",
    message: "...",
  }
}
```

## License

MIT
