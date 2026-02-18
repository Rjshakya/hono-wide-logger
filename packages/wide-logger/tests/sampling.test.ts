import { describe, it, expect } from "vitest";
import { defaultSampling } from "../src/sampling";
import type { WideEvent } from "../src/types";

describe("defaultSampling", () => {
  const defaultOptions = {
    slowThresholdMs: 2000,
    sampleRate: 0.05,
  };

  describe("error handling", () => {
    it("should always log errors with status_code >= 500", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        status_code: 500,
      };

      expect(defaultSampling(event, defaultOptions)).toBe(true);
    });

    it("should always log errors with status_code 502", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        status_code: 502,
      };

      expect(defaultSampling(event, defaultOptions)).toBe(true);
    });

    it("should always log when error field is present", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        status_code: 200,
        error: {
          type: "TestError",
          code: "TEST",
          message: "Test error",
        },
      };

      expect(defaultSampling(event, defaultOptions)).toBe(true);
    });

    it("should not log normal 4xx errors", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        status_code: 404,
      };

      // With 5% sample rate, might be true or false
      // We just verify it's not ALWAYS true
      const results = Array.from({ length: 100 }, () =>
        defaultSampling(event, defaultOptions),
      );
      const trueCount = results.filter(Boolean).length;
      // Should be around 5, definitely not 100
      expect(trueCount).toBeLessThan(50);
    });
  });

  describe("slow request handling", () => {
    it("should always log slow requests (> threshold)", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        duration_ms: 3000,
      };

      expect(defaultSampling(event, defaultOptions)).toBe(true);
    });

    it("should not log fast requests (<= threshold)", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        duration_ms: 100,
      };

      // Should respect sample rate (5%)
      const results = Array.from({ length: 100 }, () =>
        defaultSampling(event, defaultOptions),
      );
      const trueCount = results.filter(Boolean).length;
      expect(trueCount).toBeLessThan(50);
    });

    it("should respect custom slowThresholdMs", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        duration_ms: 800,
      };

      const customOptions = {
        slowThresholdMs: 1000,
        sampleRate: 0.05,
      };

      // 800ms is not slow with 1000ms threshold
      const results = Array.from({ length: 100 }, () =>
        defaultSampling(event, customOptions),
      );
      const trueCount = results.filter(Boolean).length;
      expect(trueCount).toBeLessThan(50);
    });
  });

  describe("VIP user handling", () => {
    it("should always log enterprise tier users", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        user: {
          tier: "enterprise",
        },
      };

      expect(defaultSampling(event, defaultOptions)).toBe(true);
    });

    it("should always log premium tier users", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        user: {
          tier: "premium",
        },
      };

      expect(defaultSampling(event, defaultOptions)).toBe(true);
    });

    it("should sample basic tier users", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        user: {
          tier: "basic",
        },
      };

      // Should respect sample rate
      const results = Array.from({ length: 100 }, () =>
        defaultSampling(event, defaultOptions),
      );
      const trueCount = results.filter(Boolean).length;
      expect(trueCount).toBeLessThan(50);
    });

    it("should sample users without tier", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        user: {
          id: "123",
        },
      };

      // Should respect sample rate
      const results = Array.from({ length: 100 }, () =>
        defaultSampling(event, defaultOptions),
      );
      const trueCount = results.filter(Boolean).length;
      expect(trueCount).toBeLessThan(50);
    });
  });

  describe("normal request sampling", () => {
    it("should sample at specified rate for normal requests", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        status_code: 200,
        duration_ms: 100,
      };

      // Test with 50% sample rate for clearer results
      const options = {
        slowThresholdMs: 2000,
        sampleRate: 0.5,
      };

      const results = Array.from({ length: 1000 }, () =>
        defaultSampling(event, options),
      );
      const trueCount = results.filter(Boolean).length;

      // Should be roughly 50%, allow +/- 10% variance
      expect(trueCount).toBeGreaterThan(400);
      expect(trueCount).toBeLessThan(600);
    });

    it("should respect 0% sample rate", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        status_code: 200,
        duration_ms: 100,
      };

      const options = {
        slowThresholdMs: 2000,
        sampleRate: 0,
      };

      // Should always be false for normal requests
      const results = Array.from({ length: 100 }, () =>
        defaultSampling(event, options),
      );
      const trueCount = results.filter(Boolean).length;
      expect(trueCount).toBe(0);
    });

    it("should respect 100% sample rate", () => {
      const event: WideEvent = {
        request_id: "test",
        timestamp: "2024-01-01",
        method: "GET",
        path: "/test",
        status_code: 200,
        duration_ms: 100,
      };

      const options = {
        slowThresholdMs: 2000,
        sampleRate: 1.0,
      };

      // Should always be true
      const results = Array.from({ length: 100 }, () =>
        defaultSampling(event, options),
      );
      const trueCount = results.filter(Boolean).length;
      expect(trueCount).toBe(100);
    });
  });
});
