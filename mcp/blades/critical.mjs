/**
 * Critical Blade — Critical items accumulation engine
 * Enforces: items grow (never shrink), only humans can override.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const CRITICAL_DIR = ".neuraforge/state";

function getCriticalPath(feature) { return join(CRITICAL_DIR, `${feature}-critical.json`); }

function readCritical(feature) {
  const p = getCriticalPath(feature);
  if (!existsSync(p)) return { active: [], resolved: [] };
  return JSON.parse(readFileSync(p, "utf-8"));
}

function writeCritical(feature, data) {
  if (!existsSync(CRITICAL_DIR)) mkdirSync(CRITICAL_DIR, { recursive: true });
  writeFileSync(getCriticalPath(feature), JSON.stringify(data, null, 2));
}

let nextId = { C: 1, E: 1, AC: 1 };

export const criticalTools = [
  {
    name: "critical_add",
    description: "Add a critical item (constraint, edge_case, or acceptance_criteria)",
    schema: {
      type: "object",
      properties: {
        feature: { type: "string" },
        type: { type: "string", enum: ["constraint", "edge_case", "acceptance_criteria"] },
        severity: { type: "string", enum: ["regulatory", "architectural", "operational"] },
        text: { type: "string" },
        added_by: { type: "string" },
        added_stage: { type: "number" }
      },
      required: ["feature", "type", "text", "added_by", "added_stage"]
    },
    handler({ feature, type, severity = "operational", text, added_by, added_stage }) {
      const data = readCritical(feature);
      const prefix = type === "constraint" ? "C" : type === "edge_case" ? "E" : "AC";
      const existing = data.active.filter(i => i.id.startsWith(prefix));
      const id = `${prefix}-${String(existing.length + data.resolved.filter(i => i.id.startsWith(prefix)).length + 1).padStart(3, "0")}`;
      const item = { id, type, severity, text, added_by, added_stage, status: "open", proof: null };
      data.active.push(item);
      writeCritical(feature, data);
      return { ok: true, id };
    }
  },
  {
    name: "critical_resolve",
    description: "Resolve a critical item (move to resolved with proof)",
    schema: {
      type: "object",
      properties: {
        feature: { type: "string" },
        id: { type: "string" },
        proof: { type: "string" },
        resolved_stage: { type: "number" }
      },
      required: ["feature", "id", "proof", "resolved_stage"]
    },
    handler({ feature, id, proof, resolved_stage }) {
      const data = readCritical(feature);
      const idx = data.active.findIndex(i => i.id === id);
      if (idx === -1) return { error: `Item ${id} not found in active` };
      if (!proof) return { error: "Proof is required to resolve a critical item" };
      const item = data.active.splice(idx, 1)[0];
      item.status = "✅";
      item.proof = proof;
      item.resolved_stage = resolved_stage;
      data.resolved.push(item);
      writeCritical(feature, data);
      return { ok: true, id, resolved: true };
    }
  },
  {
    name: "critical_defer",
    description: "Defer a critical item (mark ⏳ with reason)",
    schema: {
      type: "object",
      properties: { feature: { type: "string" }, id: { type: "string" }, reason: { type: "string" } },
      required: ["feature", "id", "reason"]
    },
    handler({ feature, id, reason }) {
      const data = readCritical(feature);
      const item = data.active.find(i => i.id === id);
      if (!item) return { error: `Item ${id} not found` };
      item.status = "⏳";
      item.proof = `Deferred: ${reason}`;
      writeCritical(feature, data);
      return { ok: true, id, deferred: true };
    }
  },
  {
    name: "critical_mark_failed",
    description: "Mark a critical item as ❌ (blocker — pipeline stops)",
    schema: {
      type: "object",
      properties: { feature: { type: "string" }, id: { type: "string" }, reason: { type: "string" } },
      required: ["feature", "id", "reason"]
    },
    handler({ feature, id, reason }) {
      const data = readCritical(feature);
      const item = data.active.find(i => i.id === id);
      if (!item) return { error: `Item ${id} not found` };
      item.status = "❌";
      item.proof = reason;
      writeCritical(feature, data);
      return { ok: true, id, blocked: true };
    }
  },
  {
    name: "critical_get_active",
    description: "Get all active (unresolved) critical items",
    schema: { type: "object", properties: { feature: { type: "string" } }, required: ["feature"] },
    handler({ feature }) {
      const data = readCritical(feature);
      return { active: data.active, blocked_count: data.active.filter(i => i.status === "❌").length };
    }
  },
  {
    name: "critical_get_coverage",
    description: "Get coverage report (resolved vs total)",
    schema: { type: "object", properties: { feature: { type: "string" } }, required: ["feature"] },
    handler({ feature }) {
      const data = readCritical(feature);
      const total = data.active.length + data.resolved.length;
      const resolved = data.resolved.length;
      const deferred = data.active.filter(i => i.status === "⏳").length;
      const blocked = data.active.filter(i => i.status === "❌").length;
      const open = data.active.filter(i => i.status === "open").length;
      return { total, resolved, deferred, blocked, open, ready: blocked === 0 && open === 0 };
    }
  },
  {
    name: "critical_override",
    description: "Remove a critical item (HUMAN ONLY — requires justification)",
    schema: {
      type: "object",
      properties: { feature: { type: "string" }, id: { type: "string" }, human_note: { type: "string" } },
      required: ["feature", "id", "human_note"]
    },
    handler({ feature, id, human_note }) {
      if (!human_note || human_note.length < 10) return { error: "Human justification required (min 10 chars)" };
      const data = readCritical(feature);
      const idx = data.active.findIndex(i => i.id === id);
      if (idx === -1) return { error: `Item ${id} not found` };
      const item = data.active.splice(idx, 1)[0];
      item.status = "overridden";
      item.proof = `HUMAN OVERRIDE: ${human_note}`;
      data.resolved.push(item);
      writeCritical(feature, data);
      return { ok: true, id, overridden: true };
    }
  }
];
