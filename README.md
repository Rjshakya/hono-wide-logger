# Wide Span Logger

Wide-event logging middleware for Hono - structured, high-cardinality, queryable logs inspired by [loggingsucks.com](https://loggingsucks.com).

This monorepo contains the core middleware package and example implementations for different runtimes.

[![npm version](https://badge.fury.io/js/hono-wide-logger.svg)](https://www.npmjs.com/package/hono-wide-logger)

## Philosophy

Traditional logging scatters information across multiple lines. Wide-event logging captures everything about a request in **one comprehensive structured event**:

- **One event per request** - No more grep-ing through scattered logs
- **High cardinality** - Include user IDs, request IDs, session IDs for precise filtering
- **High dimensionality** - 50+ fields with rich context
- **Structured & queryable** - JSON format for analytics dashboards

## Packages

### [`hono-wide-logger`](./packages/wide-logger/)

The core middleware package implementing wide-event logging for Hono applications.

**Published on npm:** `npm install hono-wide-logger`

```typescript
import { Hono } from "hono";
import { wideLogger } from "hono-wide-logger";

const app = new Hono();

app.use("*", wideLogger());

app.get("/api/users/:id", (c) => {
  const logger = c.get("wide-logger");

  logger.addContext("user", {
    id: c.req.param("id"),
    tier: "premium",
  });

  logger.addContext("business", {
    endpoint: "get_user",
  });

  return c.json({ user: { id: c.req.param("id") } });
});
```

**Features:**

- ✅ Auto-captures request metadata (method, path, duration, status)
- ✅ Request ID propagation via headers
- ✅ Categorized context (user, business, infra, service)
- ✅ Smart tail sampling (always logs errors + slow requests)
- ✅ Pluggable logger, storage, and sampling
- ✅ Full TypeScript support

## Examples

### [Cloudflare Workers](./examples/hono-cf/)

Complete example demonstrating all features in a Cloudflare Workers environment.

```bash
cd examples/hono-cf
pnpm install
pnpm dev
```

**Test endpoints:**

```bash
# Basic usage
curl http://localhost:8787/basic

# Custom storage
curl http://localhost:8787/storage
curl http://localhost:8787/storage/events

# Custom sampling
curl http://localhost:8787/sampling
curl -X POST http://localhost:8787/sampling -H "Content-Type: application/json" -d '{"userId": "123"}'

# All context types
curl http://localhost:8787/all-contexts/all-contexts

# Error handling
curl http://localhost:8787/error/error
curl http://localhost:8787/error/throw-error
```

### [Node.js](./examples/hono-node/)

Example for Node.js runtime environments.

```bash
cd examples/hono-node
pnpm install
pnpm dev
```

## Monorepo Structure

```
wide-span-logger/
├── packages/
│   └── wide-logger/          # Core middleware package
│       ├── src/
│       │   ├── middleware.ts   # Main implementation
│       │   ├── sampling.ts     # Sampling strategies
│       │   └── types.ts        # TypeScript definitions
│       ├── tests/              # Test suite
│       ├── package.json
│       └── README.md
│
├── examples/
│   ├── hono-cf/              # Cloudflare Workers example
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── wrangler.jsonc
│   └── hono-node/            # Node.js example
│       ├── src/
│       │   └── index.ts
│       └── package.json
│
├── .opencode/
│   └── plans/                # Implementation plans
│
├── package.json              # Root workspace config
├── pnpm-workspace.yaml       # pnpm workspace
└── README.md                 # This file
```

## Quick Start

### Installation

```bash
npm install hono-wide-logger
# or
pnpm add hono-wide-logger
# or
yarn add hono-wide-logger
```

### Basic Usage

```typescript
import { Hono } from "hono";
import { wideLogger } from "hono-wide-logger";

const app = new Hono();

// Use with default options
app.use("*", wideLogger());

app.get("/", (c) => {
  const logger = c.get("wide-logger");

  // Add context
  logger.addContext("user", { id: "user_123" });

  return c.json({ message: "Hello!" });
});
```

### Configuration

```typescript
const logger = wideLogger({
  // Custom logger (default: console)
  logger: pino(),

  // Storage for persisting events
  storage: {
    set: async (key, value) => await redis.set(key, JSON.stringify(value)),
    get: async (key) => JSON.parse(await redis.get(key)),
    delete: async (key) => await redis.del(key),
  },

  // Custom sampling
  sampling: (event) => {
    // Always log errors
    if (event.status_code >= 500) return true;
    // Log 10% of GETs
    if (event.method === "GET") return Math.random() < 0.1;
    return false;
  },

  // Sampling configuration
  slowThresholdMs: 1000, // Log requests > 1s
  sampleRate: 0.05, // 5% of normal traffic
});

app.use("*", logger);
```

## Event Structure

A complete wide event contains:

```typescript
{
  // Auto-captured HTTP basics
  request_id: "req_8bf7ec2d",
  timestamp: "2024-01-15T10:23:45.612Z",
  method: "GET",
  path: "/api/users/123",
  query_params: { filter: "active" },
  status_code: 200,
  duration_ms: 124,
  client_ip: "192.168.1.42",
  user_agent: "Mozilla/5.0...",

  // User context (you add these)
  user: {
    id: "user_123",
    tier: "premium",
    account_age_days: 365
  },

  // Business context
  business: {
    endpoint: "get_user",
    feature_flags: { new_ui: true }
  },

  // Infrastructure context
  infra: {
    region: "us-east-1",
    k8s_pod: "api-123"
  },

  // Service context
  service: {
    version: "1.2.3",
    git_sha: "abc123"
  },

  // Error details (if any)
  error: {
    type: "PaymentError",
    code: "card_declined",
    message: "Card declined by issuer"
  }
}
```

## Development

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd wide-span-logger

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Workspace Commands

```bash
# Build specific package
pnpm --filter wide-logger build

# Run tests for specific package
pnpm --filter wide-logger test

# Run Cloudflare Workers example
pnpm --filter hono-cf dev

# Run Node.js example
pnpm --filter hono-node dev
```

## Testing

The package includes comprehensive tests:

```bash
cd packages/wide-logger
pnpm test
```

**Test coverage:**

- ✅ Basic middleware behavior
- ✅ Request/response capture
- ✅ Context API (user, business, infra, service)
- ✅ Error handling
- ✅ Sampling strategies
- ✅ Storage integration

## Architecture

### Higher-Order Function Pattern

The middleware uses Hono's `createMiddleware` for type safety:

```typescript
export function wideLogger(options?: WideLoggerOptions): MiddlewareHandler {
  return createMiddleware<{
    Variables: {
      "wide-logger": WideLoggerContext;
    };
  }>(async (c, next) => {
    // ... implementation
  });
}
```

This gives full TypeScript support when accessing `c.get('wide-logger')`.

### Sampling Strategy

Default tail sampling:

- **Always keep:** Errors (status >= 500)
- **Always keep:** Slow requests (> threshold)
- **Always keep:** VIP users (enterprise/premium tier)
- **Sample:** 5% of remaining traffic

You can provide a custom sampling function or adjust the thresholds.

## Why Wide Events?

**Before (traditional logging):**

```
2024-01-15 10:23:45 INFO Request started: GET /api/users/123
2024-01-15 10:23:45 DEBUG User authenticated: user_123
2024-01-15 10:23:46 DEBUG Database query: SELECT * FROM users...
2024-01-15 10:23:46 INFO Request completed in 124ms
```

**After (wide event):**

```json
{
  "timestamp": "2024-01-15T10:23:45.612Z",
  "request_id": "req_abc123",
  "method": "GET",
  "path": "/api/users/123",
  "status_code": 200,
  "duration_ms": 124,
  "user_id": "user_123",
  "user_tier": "premium",
  "endpoint": "get_user",
  "db_queries": 1
}
```

**Benefits:**

- Query by any field: `user_id = "user_123"`
- Aggregate easily: `AVG(duration_ms) GROUP BY endpoint`
- No correlation needed - everything in one place
- Works with modern columnar databases (ClickHouse, BigQuery)

## Resources

- [loggingsucks.com](https://loggingsucks.com/) - The philosophy behind wide events
- [Hono Documentation](https://hono.dev/)
- [Stripe's Canonical Log Lines](https://stripe.com/blog/canonical-log-lines) - Similar concept

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

Built with ❤️ for the Hono community.
