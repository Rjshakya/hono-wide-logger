import { Hono } from "hono";
import { wideLogger } from "hono-wide-logger";
import type { WideEvent, Logger, Storage } from "hono-wide-logger";

// ==========================================
// EXAMPLE 1: Basic Usage with Default Options
// ==========================================
const app1 = new Hono();
app1.use("*", wideLogger());

app1.get("/", (c) => {
  const logger = c.get("wide-logger");

  // Add user context
  logger.addContext("user", {
    id: "user_123",
    tier: "premium",
    account_age_days: 365,
  });

  // Add business context
  logger.addContext("business", {
    endpoint: "basic_example",
    feature: "demo",
  });

  return c.json({
    message: "Basic example - check console for wide event log",
    requestId: c.get("wide-logger").getEvent().request_id,
  });
});

// ==========================================
// EXAMPLE 2: Custom Logger
// ==========================================
const customLogger: Logger = {
  log: (msg, ...args) => console.log("[CUSTOM LOG]", msg, ...args),
  debug: (msg, ...args) => console.debug("[CUSTOM DEBUG]", msg, ...args),
  info: (msg, ...args) => console.info("[CUSTOM INFO]", msg, ...args),
  warn: (msg, ...args) => console.warn("[CUSTOM WARN]", msg, ...args),
  error: (msg, ...args) => console.error("[CUSTOM ERROR]", msg, ...args),
};

const app2 = new Hono();
app2.use("*", wideLogger({ logger: customLogger, requestIdHeader: "" }));

app2.get("/", (c) => {
  const logger = c.get("wide-logger");

  logger.addContext("user", {
    id: "user_456",
    tier: "enterprise",
  });

  logger.addContext("service", {
    version: "1.0.0",
    git_sha: "abc123",
  });

  return c.json({
    message: "Custom logger example - logs prefixed with [CUSTOM]",
    requestId: c.get("wide-logger").getEvent().request_id,
  });
});

// ==========================================
// EXAMPLE 3: Custom Storage (In-Memory for Demo)
// ==========================================
const memoryStore = new Map<string, any>();

const customStorage: Storage = {
  set: async (key, value) => {
    memoryStore.set(key, value);
    console.log(`[STORAGE] Saved event with key: ${key}`);
  },
  get: async (key) => {
    return memoryStore.get(key);
  },
  delete: async (key) => {
    memoryStore.delete(key);
  },
};

const app3 = new Hono();
app3.use(
  "*",
  wideLogger({
    storage: customStorage,
    sampleRate: 1.0, // Log everything for demo
  }),
);

app3.get("/", (c) => {
  const logger = c.get("wide-logger");

  logger.addContext("user", {
    id: "user_789",
    tier: "basic",
  });

  logger.addContext("infra", {
    region: "us-east-1",
    availability_zone: "us-east-1a",
    k8s_pod: "demo-pod-123",
  });

  return c.json({
    message: "Storage example - event saved to in-memory store",
    requestId: c.get("wide-logger").getEvent().request_id,
    storedEventsCount: memoryStore.size,
  });
});

// Retrieve stored events
app3.get("/events", async (c) => {
  const events = Array.from(memoryStore.entries()).map(([key, value]) => ({
    key,
    event: value,
  }));

  return c.json({
    totalEvents: events.length,
    events,
  });
});

// ==========================================
// EXAMPLE 4: Custom Sampling
// ==========================================
const app4 = new Hono();
app4.use(
  "*",
  wideLogger({
    sampling: (event: WideEvent) => {
      // Custom logic: Keep all POSTs, 50% of GETs, all errors
      if (event.method === "POST") return true;
      if (event.status_code && event.status_code >= 400) return true;
      if (event.method === "GET") return Math.random() < 0.5;
      return Math.random() < 0.1;
    },
  }),
);

app4.get("/", (c) => {
  const logger = c.get("wide-logger");

  logger.addContext("user", {
    id: "user_sampling",
    tier: "basic",
  });

  logger.addContext("business", {
    test: "sampling_demo",
  });

  return c.json({
    message: "Custom sampling - 50% of GETs are logged",
    requestId: c.get("wide-logger").getEvent().request_id,
  });
});

app4.post("/", async (c) => {
  const logger = c.get("wide-logger");
  const body = await c.req.json();

  logger.addContext("user", {
    id: body.userId || "anonymous",
    tier: "premium",
  });

  logger.addContext("business", {
    action: body.action || "unknown",
  });

  return c.json({
    message: "POST requests are always logged (100%)",
    received: body,
    requestId: c.get("wide-logger").getEvent().request_id,
  });
});

// ==========================================
// EXAMPLE 5: Error Handling
// ==========================================
const app5 = new Hono();
app5.use("*", wideLogger());

app5.get("/throw-error", (c) => {
  const logger = c.get("wide-logger");
  logger.addContext("user", { id: "user-124" });

  throw new Error("Unhandled error - middleware will catch this");
});

// ==========================================
// EXAMPLE 6: All Context Types
// ==========================================
const app6 = new Hono();
app6.use(
  "*",
  wideLogger({
    slowThresholdMs: 100, // Make almost everything "slow" for demo
    sampleRate: 1.0,
  }),
);

app6.get("/", async (c) => {
  const logger = c.get("wide-logger");

  // User context
  logger.addContext("user", {
    id: "user_all_contexts",
    tier: "enterprise",
    account_age_days: 1000,
    lifetime_value_cents: 50000,
    organization_id: "org_123",
    team_id: "team_engineering",
    role: "admin",
  });

  // Business context
  logger.addContext("business", {
    endpoint: "all_contexts_demo",
    feature_flags: {
      new_ui: true,
      beta_api: false,
    },
    ab_test_cohort: "variant_b",
    order_id: "order_456",
    cart_total_cents: 9999,
    payment_method: "card",
  });

  // Infrastructure context
  logger.addContext("infra", {
    region: "us-west-2",
    availability_zone: "us-west-2a",
    host: "web-server-01",
    container_id: "container_xyz",
    k8s_namespace: "production",
    k8s_pod: "api-pod-789",
    cloud_provider: "aws",
  });

  // Service context
  logger.addContext("service", {
    name: "hono-example",
    version: "1.2.3",
    deployment_id: "deploy_20240217",
    git_sha: "def789",
    environment: "production",
  });

  // Simulate some work to make it "slow"
  await new Promise((resolve) => setTimeout(resolve, 150));

  return c.json({
    message: "All context types added - check console for complete wide event",
    requestId: logger.getEvent().request_id,
    event: logger.getEvent(),
  });
});

// ==========================================
// EXAMPLE 7: Request ID Propagation
// ==========================================
const app7 = new Hono();
app7.use("*", wideLogger());

app7.get("/", (c) => {
  const logger = c.get("wide-logger");
  const event = logger.getEvent();

  return c.json({
    message: "Request ID propagation demo",
    requestId: event.request_id,
    note: "This ID is also in the x-request-id response header",
  });
});

// ==========================================
// MAIN APP - Combine All Examples
// ==========================================
const app = new Hono();
app.use("*", wideLogger({}));

// Mount all sub-apps
app.route("/basic", app1);
app.route("/custom-logger", app2);
app.route("/storage", app3);
app.route("/sampling", app4);
app.route("/error", app5);
app.route("/all-contexts", app6);
app.route("/request-id", app7);

// Root endpoint with documentation
app.get("/", (c) => {
  return c.json({
    message: "Wide Logger Examples",
    description: "Test all use cases of @hono/wide-logger middleware",
    endpoints: {
      "GET /basic": "Basic usage with default options",
      "GET /custom-logger": "Custom logger with prefixed output",
      "GET /storage": "Custom storage (in-memory)",
      "GET /storage/events": "Retrieve all stored events",
      "GET /sampling": "Custom sampling (50% of GETs)",
      "POST /sampling": "POST always logged (100%)",
      "GET /error/throw-error": "Unhandled error (throws)",
      "GET /all-contexts": "All context types (user, business, infra, service)",
      "GET /request-id": "Request ID propagation",
    },
    usage: {
      curl_examples: {
        basic: "curl http://localhost:8787/basic",
        post_sampling: `curl -X POST http://localhost:8787/sampling \\\n          -H "Content-Type: application/json" \\\n          -d '{"userId": "123", "action": "purchase"}'`,
        with_request_id:
          'curl -H "x-request-id: my-custom-id" http://localhost:8787/basic',
      },
    },
  });
});

export default app;
