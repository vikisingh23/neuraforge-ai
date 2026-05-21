/**
 * Analytics Blade — Event logging and metrics
 */
import { appendFileSync, readFileSync, existsSync, mkdirSync } from "fs";

const LOG_PATH = ".neuraforge/analytics.log";

function ensureDir() { const dir = ".neuraforge"; if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); }

export const analyticsTools = [
  {
    name: "analytics_log_event",
    description: "Log a pipeline event (stage complete, loop, gate, error)",
    schema: {
      type: "object",
      properties: {
        feature: { type: "string" },
        stage: { type: "number" },
        event_type: { type: "string" },
        metadata: { type: "object" }
      },
      required: ["feature", "event_type"]
    },
    handler({ feature, stage, event_type, metadata = {} }) {
      ensureDir();
      const entry = JSON.stringify({ ts: new Date().toISOString(), feature, stage, event_type, ...metadata });
      appendFileSync(LOG_PATH, entry + "\n");
      return { logged: true };
    }
  },
  {
    name: "analytics_get_metrics",
    description: "Get pipeline metrics (duration, loops, blockers)",
    schema: {
      type: "object",
      properties: { feature: { type: "string" } }
    },
    handler({ feature }) {
      ensureDir();
      if (!existsSync(LOG_PATH)) return { events: 0 };
      const lines = readFileSync(LOG_PATH, "utf-8").trim().split("\n").filter(Boolean);
      const events = lines.map(l => JSON.parse(l));
      const filtered = feature ? events.filter(e => e.feature === feature) : events;
      const stages_complete = filtered.filter(e => e.event_type === "stage_complete").length;
      const loops = filtered.filter(e => e.event_type === "loop_back").length;
      const blockers = filtered.filter(e => e.event_type === "blocked").length;
      return { total_events: filtered.length, stages_complete, loops, blockers };
    }
  }
];
