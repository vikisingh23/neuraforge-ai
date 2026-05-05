---
name: load-testing
description: Generate load tests, run stress tests, detect performance regressions
category: general
triggers:
  - "use load-testing"
---

Run load tests and detect performance regressions.

## How to use
Specify endpoints and thresholds. The agent will:
1. Run load test (autocannon, configurable connections/duration)
2. Report: latency p50/p95/p99, RPS, error rate
3. Stress test: ramp connections to find breaking point
4. Compare against baseline for regression detection

For full instructions, read `agents/load-testing.md`.
