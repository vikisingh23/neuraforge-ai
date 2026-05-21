/**
 * State Blade — Pipeline state management
 * Provides atomic read/write/advance operations on pipeline state.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

const STATE_DIR = ".neuraforge/state";

function ensureDir() { if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true }); }

function getPath(feature) { return join(STATE_DIR, `${feature}.json`); }

function readState(feature) {
  const p = getPath(feature);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf-8"));
}

function writeState(feature, state) {
  ensureDir();
  writeFileSync(getPath(feature), JSON.stringify(state, null, 2));
}

export const stateTools = [
  {
    name: "state_init_pipeline",
    description: "Initialize a new feature pipeline with stages",
    schema: {
      type: "object",
      properties: {
        feature: { type: "string" },
        stages: { type: "array", items: { type: "object" } }
      },
      required: ["feature", "stages"]
    },
    handler({ feature, stages }) {
      if (readState(feature)) return { error: "Pipeline already exists", feature };
      const state = {
        feature, created: new Date().toISOString(), current_stage: 1,
        stages: stages.map((s, i) => ({ ...s, status: "pending", loops: 0, completed_at: null })),
        human_decisions: [], event_log: []
      };
      writeState(feature, state);
      return { ok: true, feature, stages: state.stages.length };
    }
  },
  {
    name: "state_get_status",
    description: "Get current pipeline status for a feature",
    schema: { type: "object", properties: { feature: { type: "string" } }, required: ["feature"] },
    handler({ feature }) {
      const state = readState(feature);
      if (!state) return { error: "Pipeline not found" };
      const current = state.stages[state.current_stage - 1];
      return { feature, current_stage: state.current_stage, stage_name: current?.name, status: current?.status, loops: current?.loops };
    }
  },
  {
    name: "state_advance",
    description: "Advance pipeline to next stage (validates invariants first)",
    schema: {
      type: "object",
      properties: {
        feature: { type: "string" },
        stage: { type: "number" },
        verdict: { type: "string" },
        has_blockers: { type: "boolean" }
      },
      required: ["feature", "stage", "verdict"]
    },
    handler({ feature, stage, verdict, has_blockers }) {
      const state = readState(feature);
      if (!state) return { error: "Pipeline not found" };
      if (has_blockers) return { error: "Cannot advance — blockers present", blocked: true };
      if (!["complete", "approved"].includes(verdict)) return { error: `Cannot advance with verdict: ${verdict}` };
      state.stages[stage - 1].status = "complete";
      state.stages[stage - 1].completed_at = new Date().toISOString();
      state.current_stage = stage + 1;
      state.event_log.push({ ts: new Date().toISOString(), event: `stage_${stage}_complete`, verdict });
      writeState(feature, state);
      return { ok: true, advanced_to: stage + 1 };
    }
  },
  {
    name: "state_loop_back",
    description: "Loop back a stage (increments counter, checks max)",
    schema: {
      type: "object",
      properties: { feature: { type: "string" }, stage: { type: "number" }, max_loops: { type: "number" } },
      required: ["feature", "stage"]
    },
    handler({ feature, stage, max_loops = 2 }) {
      const state = readState(feature);
      if (!state) return { error: "Pipeline not found" };
      const s = state.stages[stage - 1];
      s.loops = (s.loops || 0) + 1;
      if (s.loops >= max_loops) {
        state.event_log.push({ ts: new Date().toISOString(), event: `stage_${stage}_escalated`, loops: s.loops });
        writeState(feature, state);
        return { escalate: true, loops: s.loops, message: "Max loops reached. Escalate to human." };
      }
      state.event_log.push({ ts: new Date().toISOString(), event: `stage_${stage}_loop`, loop: s.loops });
      writeState(feature, state);
      return { ok: true, loops: s.loops, max_loops };
    }
  },
  {
    name: "state_record_decision",
    description: "Record a human decision (gate approval, plan selection)",
    schema: {
      type: "object",
      properties: { feature: { type: "string" }, decision: { type: "string" }, stage: { type: "number" } },
      required: ["feature", "decision"]
    },
    handler({ feature, decision, stage }) {
      const state = readState(feature);
      if (!state) return { error: "Pipeline not found" };
      state.human_decisions.push({ ts: new Date().toISOString(), stage, decision });
      state.event_log.push({ ts: new Date().toISOString(), event: "human_decision", decision });
      writeState(feature, state);
      return { ok: true };
    }
  },
  {
    name: "state_list_pipelines",
    description: "List all active pipelines",
    schema: { type: "object", properties: {} },
    handler() {
      ensureDir();
      const files = readdirSync(STATE_DIR).filter(f => f.endsWith(".json"));
      return files.map(f => {
        const state = JSON.parse(readFileSync(join(STATE_DIR, f), "utf-8"));
        return { feature: state.feature, stage: state.current_stage, created: state.created };
      });
    }
  }
];
