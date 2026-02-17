# Hono Wide Logger Example

This example demonstrates all use cases of `@hono/wide-logger` middleware in a Cloudflare Workers environment.

## Setup

```bash
# From root of monorepo
pnpm install

# Or from this directory
pnpm install
```

## Running

```bash
# From this directory
pnpm dev

# Or from root
pnpm --filter hono-example dev
```

The server will start at `http://localhost:8787`

## Test Endpoints

### 1. Basic Usage

```bash
curl http://localhost:8787/basic
```

Demonstrates basic middleware usage with default options.

### 2. Custom Logger

```bash
curl http://localhost:8787/custom-logger
```

Uses a custom logger that prefixes all output with `[CUSTOM *]`.

### 3. Custom Storage

```bash
# Log an event
curl http://localhost:8787/storage

# Retrieve all stored events
curl http://localhost:8787/storage/events
```

Stores events in an in-memory Map and provides an endpoint to retrieve them.

### 4. Custom Sampling

```bash
# GET requests - 50% sampling rate
curl http://localhost:8787/sampling

# POST requests - always logged (100%)
curl -X POST http://localhost:8787/sampling \
  -H "Content-Type: application/json" \
  -d '{"userId": "123", "action": "purchase"}'
```

Shows custom sampling logic where POSTs are always logged, GETs are 50% sampled.

### 5. Error Handling

```bash
# Manual error logging
curl http://localhost:8787/error/error

# Unhandled error (middleware catches it)
curl http://localhost:8787/error/throw-error
```

Demonstrates both manual error logging and automatic error catching.

### 6. All Context Types

```bash
curl http://localhost:8787/all-contexts/all-contexts
```

Adds all four context categories:

- `user`: User metadata (id, tier, account_age, etc.)
- `business`: Business logic (feature_flags, order_id, etc.)
- `infra`: Infrastructure (region, k8s_pod, etc.)
- `service`: Service metadata (version, git_sha, etc.)

### 7. Request ID Propagation

```bash
# Generate new request ID
curl http://localhost:8787/request-id/request-id

# Pass existing request ID
curl -H "x-request-id: my-custom-id" http://localhost:8787/request-id/request-id
```

Shows request ID generation and propagation through response headers.

### 8. API Documentation

```bash
curl http://localhost:8787/
```

Returns a list of all available endpoints.

## Expected Output

When you hit any endpoint, you should see structured JSON logs in the console:

```json
{
  "request_id": "req_abc123",
  "timestamp": "2024-01-15T10:23:45.612Z",
  "method": "GET",
  "path": "/basic",
  "status_code": 200,
  "duration_ms": 45,
  "client_ip": "127.0.0.1",
  "user_agent": "curl/8.0.0",
  "user": {
    "id": "user_123",
    "tier": "premium"
  },
  "business": {
    "endpoint": "basic_example"
  }
}
```

## Configuration Examples

### Basic

```typescript
app.use("*", wideLogger());
```

### With Custom Logger

```typescript
const logger = {
  info: (msg) => console.log("[INFO]", msg),
  error: (msg) => console.error("[ERROR]", msg),
  // ... other methods
};

app.use("*", wideLogger({ logger }));
```

### With Storage

```typescript
const storage = {
  set: async (key, value) => await redis.set(key, JSON.stringify(value)),
  get: async (key) => JSON.parse(await redis.get(key)),
  delete: async (key) => await redis.del(key),
};

app.use("*", wideLogger({ storage, sampleRate: 1.0 }));
```

### With Custom Sampling

```typescript
app.use(
  "*",
  wideLogger({
    sampling: (event) => {
      // Always log errors
      if (event.status_code >= 500) return true;
      // Log 10% of normal traffic
      return Math.random() < 0.1;
    },
  }),
);
```

## Features Tested

✅ Basic middleware usage  
✅ Type-safe context access (`c.get('wide-logger')`)  
✅ Custom logger integration  
✅ Storage backend integration  
✅ Custom sampling strategies  
✅ Error handling (manual & automatic)  
✅ All context categories (user, business, infra, service)  
✅ Request ID generation and propagation  
✅ Response headers (x-request-id)  
✅ Duration tracking  
✅ Status code capture  
✅ Query parameter capture

## Architecture

This example uses:

- **Hono** - Web framework
- **Cloudflare Workers** - Runtime
- **@hono/wide-logger** - Wide-event logging middleware
- **In-memory storage** - For demo purposes (replace with Redis/DB in production)

---

## Original Template Info

```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>();
```
